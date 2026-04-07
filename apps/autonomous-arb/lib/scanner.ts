import { Prisma, type StrategySettings } from "@prisma/client";
import { parseUnits } from "viem";
import { db } from "./db";
import { getServerEnv } from "./env";
import { getToken, parseAllowedPairs } from "./tokens";
import { quoteUniswapV3ExactIn } from "./dex/uniswap";
import { quoteSushiswapExactIn } from "./dex/sushiswap";
import { evaluateProfitability } from "./profitability";
import { calculateUnitAmt } from "./math";
import type { ArbitrageOpportunity } from "./types";
import { getTokenUsdPrice } from "./pricing";

const env = getServerEnv();

function clampBorrowAmount(maxPositionUsd: number, tokenUsdPrice: number, tokenDecimals: number): bigint {
  const tokenAmount = Math.max(0.0001, maxPositionUsd / Math.max(0.000001, tokenUsdPrice));
  return parseUnits(tokenAmount.toFixed(Math.min(tokenDecimals, 8)), tokenDecimals);
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

export async function scanForOpportunities(settings: StrategySettings): Promise<ArbitrageOpportunity[]> {
  const allowedPairs = parseAllowedPairs(settings.allowedPairs);
  const out: ArbitrageOpportunity[] = [];

  for (const pair of allowedPairs) {
    const borrowToken = getToken(pair.borrowToken);
    const midToken = getToken(pair.midToken);
    const tokenUsd = await getTokenUsdPrice(borrowToken.address, borrowToken.decimals);
    const borrowAmountWei = clampBorrowAmount(toNumber(settings.maxPositionUsd), tokenUsd, borrowToken.decimals);
    if (borrowAmountWei <= 0n) continue;

    const [uniForward, sushiForward] = await Promise.all([
      quoteUniswapV3ExactIn(borrowToken.address, midToken.address, borrowAmountWei),
      quoteSushiswapExactIn(borrowToken.address, midToken.address, borrowAmountWei),
    ]);

    if (uniForward) {
      const sushiBack = await quoteSushiswapExactIn(midToken.address, borrowToken.address, uniForward.amountOut);
      if (sushiBack) {
        const quoteAgeMs = Date.now() - Math.min(uniForward.timestamp, sushiBack.timestamp);
        const firstMinOut = uniForward.amountOut - (uniForward.amountOut * BigInt(settings.maxSlippageBps)) / 10_000n;
        const secondMinOut = sushiBack.amountOut - (sushiBack.amountOut * BigInt(settings.maxSlippageBps)) / 10_000n;
        out.push(
          await evaluateProfitability({
            borrowToken,
            midToken,
            borrowAmountWei,
            firstHopOut: uniForward.amountOut,
            secondHopOut: sushiBack.amountOut,
            sourceDex: "UNISWAP_V3",
            targetDex: "SUSHISWAP",
            maxSlippageBps: settings.maxSlippageBps,
            flashLoanFeeBps: env.FLASH_LOAN_FEE_BPS,
            routeDescription: `${borrowToken.symbol}->${midToken.symbol} on UniswapV3 then ${midToken.symbol}->${borrowToken.symbol} on Sushi`,
            quoteAgeMs,
            uniswapFeeTier: uniForward.feeTier,
            firstHopUnitAmt: calculateUnitAmt(firstMinOut, borrowAmountWei),
            secondHopUnitAmt: calculateUnitAmt(secondMinOut, uniForward.amountOut),
            estimatedGas: Number(uniForward.gasEstimate + sushiBack.gasEstimate + 220_000n),
          })
        );
      }
    }

    if (sushiForward) {
      const uniBack = await quoteUniswapV3ExactIn(midToken.address, borrowToken.address, sushiForward.amountOut);
      if (uniBack) {
        const quoteAgeMs = Date.now() - Math.min(sushiForward.timestamp, uniBack.timestamp);
        const firstMinOut = sushiForward.amountOut - (sushiForward.amountOut * BigInt(settings.maxSlippageBps)) / 10_000n;
        const secondMinOut = uniBack.amountOut - (uniBack.amountOut * BigInt(settings.maxSlippageBps)) / 10_000n;
        out.push(
          await evaluateProfitability({
            borrowToken,
            midToken,
            borrowAmountWei,
            firstHopOut: sushiForward.amountOut,
            secondHopOut: uniBack.amountOut,
            sourceDex: "SUSHISWAP",
            targetDex: "UNISWAP_V3",
            maxSlippageBps: settings.maxSlippageBps,
            flashLoanFeeBps: env.FLASH_LOAN_FEE_BPS,
            routeDescription: `${borrowToken.symbol}->${midToken.symbol} on Sushi then ${midToken.symbol}->${borrowToken.symbol} on UniswapV3`,
            quoteAgeMs,
            uniswapFeeTier: uniBack.feeTier,
            firstHopUnitAmt: calculateUnitAmt(firstMinOut, borrowAmountWei),
            secondHopUnitAmt: calculateUnitAmt(secondMinOut, sushiForward.amountOut),
            estimatedGas: Number(sushiForward.gasEstimate + uniBack.gasEstimate + 220_000n),
          })
        );
      }
    }
  }

  return out.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(6));
}

export async function persistScanResults(
  userId: string,
  settings: StrategySettings,
  opportunities: ArbitrageOpportunity[]
): Promise<void> {
  for (const opp of opportunities) {
    await db.opportunity.create({
      data: {
        userId,
        settingsId: settings.id,
        sourceDex: opp.sourceDex,
        targetDex: opp.targetDex,
        borrowToken: opp.borrowToken.address,
        midToken: opp.midToken.address,
        borrowAmountWei: opp.borrowAmountWei.toString(),
        borrowAmountUsd: toDecimal(opp.borrowAmountUsd),
        grossProfitUsd: toDecimal(opp.grossProfitUsd),
        netProfitUsd: toDecimal(opp.netProfitUsd),
        gasCostUsd: toDecimal(opp.gasCostUsd),
        flashFeeUsd: toDecimal(opp.flashFeeUsd),
        slippageImpactUsd: toDecimal(opp.slippageImpactUsd),
        confidenceScore: new Prisma.Decimal(opp.confidenceScore.toFixed(2)),
        quoteTimestamp: new Date(Date.now() - opp.quoteAgeMs),
        quoteAgeMs: opp.quoteAgeMs,
        executable: opp.netProfitUsd >= toNumber(settings.minNetProfitUsd),
      },
    });
  }
}

export async function refreshOpportunities(): Promise<number> {
  const settingsRows = await db.strategySettings.findMany({
    where: {
      enabled: true,
      strategyPaused: false,
      strategyMode: { in: ["ARBITRAGE", "HYBRID"] },
      dsaAccount: {
        authorityEnabled: true,
      },
    },
    include: { user: true },
  });

  let total = 0;
  for (const settings of settingsRows) {
    const opportunities = await scanForOpportunities(settings);
    if (!opportunities.length) continue;
    await persistScanResults(settings.userId, settings, opportunities);
    total += opportunities.length;
  }
  return total;
}
