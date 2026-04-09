import { db } from "./db";
import { arbiscanTxUrl } from "./chain";
import { buildFlashLoanArbSpell, createNodeDsaForAccount, estimateDsaCastGas } from "./dsa-node";
import { logger } from "./logger";
import { enforceRisk } from "./risk";
import { buildFlashLoanLiquidationSpell, evaluateLiquidationReadiness } from "./liquidation";
import type { ArbitrageOpportunity, StrategySettingsShape } from "./types";

function toFixedDecimalString(n: number): string {
  return n.toFixed(6);
}

type FailureCtx = {
  settingsId: string;
  executionId: string;
  opportunityId?: string;
  reason: string;
  hardStop?: boolean;
};

async function markFailure(ctx: FailureCtx) {
  await db.$transaction(async (tx) => {
    await tx.execution.update({
      where: { id: ctx.executionId },
      data: { status: "failed", failureReason: ctx.reason },
    });
    if (ctx.opportunityId) {
      await tx.opportunity.update({
        where: { id: ctx.opportunityId },
        data: { executable: false },
      });
    }
    await tx.strategySettings.update({
      where: { id: ctx.settingsId },
      data: {
        consecutiveFailures: { increment: 1 },
        strategyPaused: ctx.hardStop ? true : undefined,
      },
    });
  });
}

export async function executeOpportunity(
  userId: string,
  settingsId: string,
  executionId: string,
  opportunity: ArbitrageOpportunity
): Promise<void> {
  const oppId = opportunity.id;
  if (!oppId) throw new Error("Opportunity id missing");

  const [globalState, settings, dsaAccount] = await Promise.all([
    db.globalState.findUnique({ where: { id: 1 } }),
    db.strategySettings.findUnique({ where: { id: settingsId } }),
    db.dsaAccount.findFirst({
      where: { userId, authorityEnabled: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!settings || !dsaAccount) {
    await markFailure({
      settingsId,
      executionId,
      opportunityId: oppId,
      reason: "Missing settings or authorized DSA account.",
      hardStop: true,
    });
    return;
  }

  const pnlToday = await db.execution.aggregate({
    where: {
      userId,
      createdAt: {
        gte: new Date(new Date().toISOString().slice(0, 10)),
      },
      realizedPnlUsd: { not: null },
    },
    _sum: { realizedPnlUsd: true },
  });

  const openExecutions = await db.execution.findMany({
    where: {
      userId,
      status: { in: ["pending", "submitted"] },
      borrowToken: opportunity.borrowToken.address.toLowerCase(),
    },
    select: { estimatedNetUsd: true },
  });

  const tokenExposureUsd = openExecutions.reduce((acc, row) => acc + Number(row.estimatedNetUsd.toString()), 0);

  const gate = await enforceRisk(opportunity, settings as unknown as StrategySettingsShape, userId);

  if (!gate.ok) {
    await markFailure({
      settingsId,
      executionId,
      opportunityId: oppId,
      reason: gate.reason,
      hardStop: gate.hardStop,
    });
    return;
  }

  try {
    const dsa = await createNodeDsaForAccount(dsaAccount.dsaId);
    const spells = buildFlashLoanArbSpell(dsa, opportunity, settings as unknown as StrategySettingsShape);
    const gasEstimate = await estimateDsaCastGas(dsa, spells);

    if (gasEstimate > 1_500_000) {
      await markFailure({
        settingsId,
        executionId,
        opportunityId: oppId,
        reason: `Estimated gas too high: ${gasEstimate}`,
      });
      return;
    }

    const txHash = await spells.cast();
    await db.$transaction(async (tx) => {
      await tx.execution.update({
        where: { id: executionId },
        data: {
          status: "submitted",
          txHash,
          arbiscanUrl: arbiscanTxUrl(txHash),
        },
      });
      await tx.opportunity.update({
        where: { id: oppId },
        data: { executable: false },
      });
      await tx.strategySettings.update({
        where: { id: settingsId },
        data: {
          lastExecutedAt: new Date(),
          consecutiveFailures: 0,
        },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Execution transaction failed";
    logger.error({ reason, executionId, opportunityId: oppId }, "execution failed");
    await markFailure({
      settingsId,
      executionId,
      opportunityId: oppId,
      reason,
    });
  }
}

export async function createExecutionRecord(
  userId: string,
  settingsId: string,
  opportunity: ArbitrageOpportunity
): Promise<{ id: string }> {
  const idempotencyKey = `exec-${opportunity.id ?? "adhoc"}-${Date.now()}`;
  const execution = await db.execution.create({
    data: {
      userId,
      settingsId,
      opportunityId: opportunity.id ?? null,
      idempotencyKey,
      status: "pending",
      borrowToken: opportunity.borrowToken.address.toLowerCase(),
      borrowAmountWei: opportunity.borrowAmountWei.toString(),
      estimatedNetUsd: toFixedDecimalString(opportunity.netProfitUsd),
      routeDescription: opportunity.routeDescription,
    },
    select: { id: true },
  });
  return execution;
}

export async function createLiquidationExecutionRecord(
  userId: string,
  settingsId: string,
  input: { borrowToken: `0x${string}`; borrowAmountWei: bigint; routeDescription: string }
): Promise<{ id: string }> {
  const idempotencyKey = `liq-${settingsId}-${Date.now()}`;
  const execution = await db.execution.create({
    data: {
      userId,
      settingsId,
      status: "pending",
      idempotencyKey,
      borrowToken: input.borrowToken.toLowerCase(),
      borrowAmountWei: input.borrowAmountWei.toString(),
      estimatedNetUsd: "0.000000",
      routeDescription: input.routeDescription,
    },
    select: { id: true },
  });
  return execution;
}

export async function executeLiquidationExecution(
  userId: string,
  settingsId: string,
  executionId: string
): Promise<void> {
  const settings = await db.strategySettings.findUnique({ where: { id: settingsId } });

  if (!settings) {
    await markFailure({
      settingsId,
      executionId,
      reason: "Missing settings or authorized DSA account.",
      hardStop: true,
    });
    return;
  }

  const dsaAccount = await db.dsaAccount.findFirst({
    where: {
      id: settings.dsaAccountId,
      userId,
      authorityEnabled: true,
    },
  });

  if (!dsaAccount) {
    await markFailure({
      settingsId,
      executionId,
      reason: "Missing settings or authorized DSA account.",
      hardStop: true,
    });
    return;
  }
  if (!settings.enabled || settings.strategyPaused) {
    await db.execution.update({
      where: { id: executionId },
      data: { status: "skipped", failureReason: "Strategy disabled or paused." },
    });
    return;
  }

  const readiness = await evaluateLiquidationReadiness(settings, dsaAccount.address as `0x${string}`);
  if (!readiness.trigger || !readiness.config) {
    await db.execution.update({
      where: { id: executionId },
      data: {
        status: "skipped",
        failureReason: readiness.reason ?? `Health factor ${readiness.healthFactor.toFixed(4)} above trigger.`,
      },
    });
    return;
  }

  try {
    const dsa = await createNodeDsaForAccount(dsaAccount.dsaId);
    const spells = buildFlashLoanLiquidationSpell(dsa, readiness.config);
    const gasEstimate = await estimateDsaCastGas(dsa, spells);
    if (gasEstimate > 1_500_000) {
      await markFailure({
        settingsId,
        executionId,
        reason: `Estimated gas too high: ${gasEstimate}`,
      });
      return;
    }

    const txHash = await spells.cast();
    await db.$transaction(async (tx) => {
      await tx.execution.update({
        where: { id: executionId },
        data: {
          status: "submitted",
          txHash,
          arbiscanUrl: arbiscanTxUrl(txHash),
        },
      });
      await tx.strategySettings.update({
        where: { id: settingsId },
        data: {
          lastExecutedAt: new Date(),
          consecutiveFailures: 0,
        },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Liquidation execution failed";
    logger.error({ reason, executionId }, "liquidation execution failed");
    await markFailure({
      settingsId,
      executionId,
      reason,
    });
  }
}
