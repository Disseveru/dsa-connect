import { describe, expect, it, vi } from "vitest";
import { applyRiskControls } from "@/lib/risk";
import { evaluateProfitability } from "@/lib/profitability";
import { TOKENS } from "@/lib/chain";
import type { ArbitrageOpportunity, StrategySettingsShape } from "@/lib/types";

vi.mock("@/lib/clients", () => ({
  publicClient: {
    getGasPrice: vi.fn().mockResolvedValue(100000000n),
  },
}));

vi.mock("@/lib/pricing", () => ({
  getTokenUsdPrice: vi.fn().mockImplementation(async (address: string) => {
    if (address.toLowerCase() === TOKENS.WETH.address.toLowerCase()) return 2500;
    return 1;
  }),
}));

vi.mock("@/lib/dex/sushiswap", () => ({
  getSushiswapReserveIn: vi.fn().mockResolvedValue(2_000_000_000n),
}));

const baseSettings: StrategySettingsShape = {
  id: "settings-1",
  enabled: true,
  strategyPaused: false,
  minNetProfitUsd: 5,
  maxSlippageBps: 30,
  gasCeilingGwei: 5,
  maxPositionUsd: 500,
  allowedPairs: [`${TOKENS.USDC.address}:${TOKENS.WETH.address}`],
  cooldownSeconds: 60,
  dailyLossCapUsd: 100,
  perTokenExposureUsd: { [TOKENS.USDC.address.toLowerCase()]: 1000 },
  quoteStaleAfterMs: 15000,
  liquidityDepthBps: 900,
  consecutiveFailureLimit: 3,
  consecutiveFailures: 0,
  lastExecutedAt: null,
};

describe("profitability + risk gating", () => {
  it("computes positive net profitability when output > borrow", async () => {
    const opp = await evaluateProfitability({
      borrowToken: TOKENS.USDC,
      midToken: TOKENS.WETH,
      borrowAmountWei: 1000_000000n,
      firstHopOut: 500000000000000000n,
      secondHopOut: 1010_000000n,
      sourceDex: "SUSHISWAP",
      targetDex: "UNISWAP_V3",
      maxSlippageBps: 20,
      flashLoanFeeBps: 9,
      routeDescription: "USDC->WETH->USDC",
      quoteAgeMs: 1000,
      uniswapFeeTier: 500,
      firstHopUnitAmt: 500000000000000000n,
      secondHopUnitAmt: 2000000000n,
    });

    expect(opp.grossProfitUsd).toBeGreaterThan(0);
    expect(typeof opp.netProfitUsd).toBe("number");
  });

  it("blocks on daily loss hard-stop", async () => {
    const opportunity: ArbitrageOpportunity = {
      sourceDex: "UNISWAP_V3",
      targetDex: "SUSHISWAP",
      borrowToken: TOKENS.USDC,
      midToken: TOKENS.WETH,
      borrowAmountWei: 1000_000000n,
      borrowAmountUsd: 1000,
      grossProfitUsd: 50,
      netProfitUsd: 25,
      gasCostUsd: 5,
      flashFeeUsd: 1,
      slippageImpactUsd: 2,
      confidenceScore: 90,
      quoteAgeMs: 1000,
      routeDescription: "USDC->WETH->USDC",
      firstHopOut: 1n,
      secondHopOut: 1n,
      firstHopUnitAmt: 1n,
      secondHopUnitAmt: 1n,
      uniswapFeeTier: 500,
      estimatedGas: 500000,
    };

    const result = await applyRiskControls(baseSettings, opportunity, {
      globalPaused: false,
      dailyRealizedPnlUsd: -101,
      tokenExposureUsd: {},
    });

    expect(result.allowed).toBe(false);
    expect(result.hardStop).toBe(true);
    expect(result.reasons.join(" ")).toContain("Daily loss cap");
  });
});
