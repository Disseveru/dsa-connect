import { formatUnits } from "viem";
import { prisma } from "./db";
import type { ArbitrageOpportunity, StrategySettingsShape } from "./types";
import { getSushiswapReserveIn } from "./dex/sushiswap";
import { publicClient } from "./clients";

type RiskGate = {
  ok: boolean;
  reason: string;
  hardStop: boolean;
};

function fail(reason: string, hardStop = false): RiskGate {
  return { ok: false, reason, hardStop };
}

export async function enforceRisk(
  opportunity: ArbitrageOpportunity,
  settings: StrategySettingsShape,
  userId: string
): Promise<RiskGate> {
  const globalState = await prisma.globalState.findUnique({ where: { id: 1 } });
  if (globalState?.globalPaused) return fail("Global emergency pause is enabled.", true);
  if (settings.strategyPaused) return fail("Strategy is paused.", true);
  if (!settings.enabled) return fail("Autonomous trading is disabled.");
  if (settings.consecutiveFailures >= settings.consecutiveFailureLimit) {
    return fail("Consecutive failure limit reached. Strategy auto-disabled.", true);
  }

  const gasPrice = await publicClient.getGasPrice();
  const gasGwei = Number(formatUnits(gasPrice, 9));
  if (gasGwei > settings.gasCeilingGwei) return fail("Gas price exceeds configured ceiling.", true);

  if (opportunity.quoteAgeMs > settings.quoteStaleAfterMs) {
    return fail("Quote staleness guard blocked execution.");
  }

  if (opportunity.netProfitUsd < settings.minNetProfitUsd) {
    return fail("Net profit below configured threshold.");
  }

  if (settings.lastExecutedAt) {
    const elapsedMs = Date.now() - new Date(settings.lastExecutedAt).getTime();
    if (elapsedMs < settings.cooldownSeconds * 1000) return fail("Cooldown active.");
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const pnlRows = await prisma.execution.findMany({
    where: { userId, createdAt: { gte: dayStart }, status: { in: ["confirmed", "failed"] } },
    select: { realizedPnlUsd: true },
  });
  const dailyPnl = pnlRows.reduce((acc, row) => acc + Number(row.realizedPnlUsd ?? 0), 0);
  if (dailyPnl <= -Math.abs(settings.dailyLossCapUsd)) {
    return fail("Daily loss cap reached.", true);
  }

  const reserveIn = await getSushiswapReserveIn(opportunity.borrowToken.address, opportunity.midToken.address);
  const reserveFloat = Number(formatUnits(reserveIn, opportunity.borrowToken.decimals));
  const borrowFloat = Number(formatUnits(opportunity.borrowAmountWei, opportunity.borrowToken.decimals));
  const maxDepth = reserveFloat * (settings.liquidityDepthBps / 10_000);
  if (borrowFloat > maxDepth) return fail("Liquidity depth guard triggered.");

  const exposureCaps = settings.perTokenExposureUsd ?? {};
  const tokenKey = opportunity.borrowToken.address.toLowerCase();
  const cap = exposureCaps[tokenKey] ?? 0;
  if (cap > 0) {
    const openExposureRows = await prisma.execution.findMany({
      where: { userId, status: { in: ["pending", "submitted"] }, borrowToken: tokenKey },
      select: { estimatedNetUsd: true },
    });
    const exposure = openExposureRows.reduce((acc, row) => acc + Number(row.estimatedNetUsd), 0);
    if (exposure + opportunity.borrowAmountUsd > cap) {
      return fail("Per-token exposure cap exceeded.");
    }
  }

  return { ok: true, reason: "", hardStop: false };
}

export async function applyRiskControls(
  settings: StrategySettingsShape,
  opportunity: ArbitrageOpportunity,
  context: {
    globalPaused: boolean;
    dailyRealizedPnlUsd: number;
    tokenExposureUsd: Record<string, number>;
    nowMs?: number;
  }
): Promise<{ allowed: boolean; hardStop: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  let hardStop = false;

  if (context.globalPaused) {
    reasons.push("Global emergency pause is active.");
    hardStop = true;
  }
  if (settings.strategyPaused) {
    reasons.push("Strategy is paused.");
    hardStop = true;
  }
  if (settings.consecutiveFailures >= settings.consecutiveFailureLimit) {
    reasons.push("Consecutive failure hard-stop reached.");
    hardStop = true;
  }
  if (context.dailyRealizedPnlUsd <= -Math.abs(settings.dailyLossCapUsd)) {
    reasons.push("Daily loss cap reached.");
    hardStop = true;
  }

  const gasPrice = await publicClient.getGasPrice();
  const gasGwei = Number(formatUnits(gasPrice, 9));
  if (gasGwei > settings.gasCeilingGwei) {
    reasons.push("Gas price above ceiling.");
    hardStop = true;
  }

  if (opportunity.quoteAgeMs > settings.quoteStaleAfterMs) reasons.push("Quote staleness guard triggered.");
  if (opportunity.netProfitUsd < settings.minNetProfitUsd) reasons.push("Net profit below threshold.");

  if (settings.lastExecutedAt) {
    const elapsed = (context.nowMs ?? Date.now()) - settings.lastExecutedAt.getTime();
    if (elapsed < settings.cooldownSeconds * 1000) reasons.push("Cooldown active.");
  }

  const reserveIn = await getSushiswapReserveIn(opportunity.borrowToken.address, opportunity.midToken.address);
  const reserveInFloat = Number(formatUnits(reserveIn, opportunity.borrowToken.decimals));
  const borrowFloat = Number(formatUnits(opportunity.borrowAmountWei, opportunity.borrowToken.decimals));
  const maxDepth = reserveInFloat * (settings.liquidityDepthBps / 10_000);
  if (borrowFloat > maxDepth) reasons.push("Liquidity depth guard triggered.");

  const exposureCaps = settings.perTokenExposureUsd ?? {};
  const tokenKey = opportunity.borrowToken.address.toLowerCase();
  const cap = exposureCaps[tokenKey] ?? 0;
  const exposure = context.tokenExposureUsd[tokenKey] ?? 0;
  if (cap > 0 && exposure + opportunity.borrowAmountUsd > cap) reasons.push("Per-token exposure cap reached.");

  return { allowed: reasons.length === 0, hardStop, reasons };
}
