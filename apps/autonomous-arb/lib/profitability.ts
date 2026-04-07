import type { ArbitrageOpportunity, TokenConfig } from "./types";
import { bpsToRatio } from "./math";
import { getTokenUsdPrice } from "./pricing";
import { publicClient } from "./clients";
import { TOKENS } from "./chain";
import { formatUnits } from "viem";

type ProfitabilityParams = {
  borrowToken: TokenConfig;
  midToken: TokenConfig;
  borrowAmountWei: bigint;
  firstHopOut: bigint;
  secondHopOut: bigint;
  sourceDex: "UNISWAP_V3" | "SUSHISWAP";
  targetDex: "UNISWAP_V3" | "SUSHISWAP";
  maxSlippageBps: number;
  flashLoanFeeBps: number;
  routeDescription: string;
  quoteTimestamp?: number;
  quoteAgeMs: number;
  uniswapFeeTier: number;
  firstHopUnitAmt: bigint;
  secondHopUnitAmt: bigint;
  estimatedGas?: number;
};

export async function evaluateProfitability(params: ProfitabilityParams): Promise<ArbitrageOpportunity> {
  const borrowTokenUsd = await getTokenUsdPrice(params.borrowToken.address, params.borrowToken.decimals);
  const ethUsd = await getTokenUsdPrice(TOKENS.WETH.address, TOKENS.WETH.decimals);

  const borrowAmountFloat = Number(formatUnits(params.borrowAmountWei, params.borrowToken.decimals));
  const secondHopFloat = Number(formatUnits(params.secondHopOut, params.borrowToken.decimals));
  const borrowAmountUsd = borrowAmountFloat * borrowTokenUsd;
  const grossProfitUsd = (secondHopFloat - borrowAmountFloat) * borrowTokenUsd;

  const flashFeeUsd = borrowAmountUsd * bpsToRatio(params.flashLoanFeeBps);
  const slippageImpactUsd = borrowAmountUsd * bpsToRatio(params.maxSlippageBps);

  const gasPrice = await publicClient.getGasPrice();
  const estimatedGas = 650_000n;
  const gasCostEth = Number(estimatedGas * gasPrice) / 1e18;
  const gasCostUsd = gasCostEth * ethUsd;

  const netProfitUsd = grossProfitUsd - flashFeeUsd - slippageImpactUsd - gasCostUsd;

  const confidenceScore = Math.max(
    1,
    Math.min(100, 65 + Math.round((netProfitUsd / Math.max(1, borrowAmountUsd)) * 1000) - Math.floor(params.quoteAgeMs / 500))
  );

  return {
    id: "",
    sourceDex: params.sourceDex,
    targetDex: params.targetDex,
    borrowToken: params.borrowToken,
    midToken: params.midToken,
    borrowAmountWei: params.borrowAmountWei,
    borrowAmountUsd,
    grossProfitUsd,
    netProfitUsd,
    gasCostUsd,
    flashFeeUsd,
    slippageImpactUsd,
    confidenceScore,
    quoteAgeMs: params.quoteAgeMs,
    routeDescription: params.routeDescription,
    firstHopOut: params.firstHopOut,
    secondHopOut: params.secondHopOut,
    firstHopUnitAmt: params.firstHopUnitAmt,
    secondHopUnitAmt: params.secondHopUnitAmt,
    uniswapFeeTier: params.uniswapFeeTier,
    routeAFeeBps: 30,
    routeBFeeBps: 30,
    estimatedGasUnits: params.estimatedGas ?? 650_000,
    estimatedGas: params.estimatedGas ?? 650_000,
    quoteTimestamp: params.quoteTimestamp ?? Date.now() - params.quoteAgeMs,
  };
}
