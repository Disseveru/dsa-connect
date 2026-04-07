import { prisma } from "./db";
import { getServerEnv } from "./env";
import { logger } from "./logger";
import {
  createExecutionRecord,
  createLiquidationExecutionRecord,
  executeLiquidationExecution,
  executeOpportunity,
} from "./executor";
import { evaluateLiquidationReadiness } from "./liquidation";
import { refreshOpportunities } from "./scanner";

const env = getServerEnv();

export async function workerTick(): Promise<void> {
  await prisma.workerHeartbeat.upsert({
    where: { id: "arb-worker" },
    update: { lastSeenAt: new Date(), message: "running" },
    create: { id: "arb-worker", lastSeenAt: new Date(), message: "running" },
  });

  const discovered = await refreshOpportunities();
  logger.info({ discovered }, "scanner tick complete");

  const executionable = await prisma.opportunity.findMany({
    where: { executable: true },
    orderBy: [{ netProfitUsd: "desc" }, { confidenceScore: "desc" }, { createdAt: "desc" }],
    take: 5,
  });

  for (const row of executionable) {
    const settings = await prisma.strategySettings.findUnique({ where: { id: row.settingsId } });
    if (!settings || !settings.enabled) continue;

    const execution = await createExecutionRecord(row.userId, settings.id, {
      id: row.id,
      sourceDex: row.sourceDex as "UNISWAP_V3" | "SUSHISWAP",
      targetDex: row.targetDex as "UNISWAP_V3" | "SUSHISWAP",
      borrowToken: { symbol: "BORROW", address: row.borrowToken as `0x${string}`, decimals: 6 },
      midToken: { symbol: "MID", address: row.midToken as `0x${string}`, decimals: 18 },
      borrowAmountWei: BigInt(row.borrowAmountWei),
      borrowAmountUsd: Number(row.borrowAmountUsd),
      grossProfitUsd: Number(row.grossProfitUsd),
      netProfitUsd: Number(row.netProfitUsd),
      gasCostUsd: Number(row.gasCostUsd),
      flashFeeUsd: Number(row.flashFeeUsd),
      slippageImpactUsd: Number(row.slippageImpactUsd),
      confidenceScore: Number(row.confidenceScore),
      quoteAgeMs: row.quoteAgeMs,
      routeDescription: `${row.sourceDex}->${row.targetDex}`,
      firstHopOut: 0n,
      secondHopOut: 0n,
      firstHopUnitAmt: 0n,
      secondHopUnitAmt: 0n,
      uniswapFeeTier: 500,
      routeAFeeBps: 30,
      routeBFeeBps: 30,
      estimatedGasUnits: 650000,
    });

    await executeOpportunity(row.userId, settings.id, execution.id, {
      id: row.id,
      sourceDex: row.sourceDex as "UNISWAP_V3" | "SUSHISWAP",
      targetDex: row.targetDex as "UNISWAP_V3" | "SUSHISWAP",
      borrowToken: { symbol: "BORROW", address: row.borrowToken as `0x${string}`, decimals: 6 },
      midToken: { symbol: "MID", address: row.midToken as `0x${string}`, decimals: 18 },
      borrowAmountWei: BigInt(row.borrowAmountWei),
      borrowAmountUsd: Number(row.borrowAmountUsd),
      grossProfitUsd: Number(row.grossProfitUsd),
      netProfitUsd: Number(row.netProfitUsd),
      gasCostUsd: Number(row.gasCostUsd),
      flashFeeUsd: Number(row.flashFeeUsd),
      slippageImpactUsd: Number(row.slippageImpactUsd),
      confidenceScore: Number(row.confidenceScore),
      quoteAgeMs: row.quoteAgeMs,
      routeDescription: `${row.sourceDex}->${row.targetDex}`,
      firstHopOut: 0n,
      secondHopOut: 0n,
      firstHopUnitAmt: 0n,
      secondHopUnitAmt: 0n,
      uniswapFeeTier: 500,
      routeAFeeBps: 30,
      routeBFeeBps: 30,
      estimatedGasUnits: 650000,
    });
  }

  const liquidationSettings = await prisma.strategySettings.findMany({
    where: {
      enabled: true,
      strategyPaused: false,
      strategyMode: { in: ["LIQUIDATION", "HYBRID"] },
      dsaAccount: { authorityEnabled: true },
    },
    include: { dsaAccount: true },
  });

  for (const settings of liquidationSettings) {
    if (settings.lastExecutedAt) {
      const elapsedMs = Date.now() - settings.lastExecutedAt.getTime();
      if (elapsedMs < settings.cooldownSeconds * 1000) continue;
    }

    const readiness = await evaluateLiquidationReadiness(settings, settings.dsaAccount.address as `0x${string}`);
    if (!readiness.trigger || !readiness.config) continue;

    const execution = await createLiquidationExecutionRecord(settings.userId, settings.id, {
      borrowToken: readiness.config.debtToken,
      borrowAmountWei: readiness.config.repayAmountWei,
      routeDescription: `AAVE_V3_DELEVERAGE ${readiness.summary ?? ""} hf=${readiness.healthFactor.toFixed(4)}`,
    });
    await executeLiquidationExecution(settings.userId, settings.id, execution.id);
  }
}

export async function runWorkerLoop(): Promise<void> {
  logger.info("starting autonomous worker");
  while (true) {
    try {
      await workerTick();
    } catch (error) {
      logger.error({ error }, "worker loop failure");
    }
    await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_INTERVAL_MS));
  }
}
