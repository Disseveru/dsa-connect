import { describe, expect, it } from "vitest";
import { buildFlashLoanArbSpell, buildFlashLoanLiquidationSpell } from "@/lib/dsa-node";
import { MAINNET_CHAIN_ID, TOKENS } from "@/lib/chain";
import type { ArbitrageOpportunity, StrategySettingsShape } from "@/lib/types";

const settings: StrategySettingsShape = {
  id: "s",
  userId: "u",
  dsaAccountId: "d",
  enabled: true,
  strategyPaused: false,
  strategyMode: "ARBITRAGE",
  minNetProfitUsd: 10,
  maxSlippageBps: 40,
  gasCeilingGwei: 1,
  maxPositionUsd: 500,
  liquidationHealthFactor: 1.05,
  liquidationDebtToken: null,
  liquidationCollateralToken: null,
  liquidationRepayAmount: null,
  liquidationWithdrawAmount: null,
  liquidationRateMode: 2,
  allowedPairs: [],
  cooldownSeconds: 0,
  dailyLossCapUsd: 100,
  perTokenExposureUsd: {},
  quoteStaleAfterMs: 15_000,
  liquidityDepthBps: 700,
  consecutiveFailureLimit: 3,
  consecutiveFailures: 0,
  lastExecutedAt: null,
};

const opportunity: ArbitrageOpportunity = {
  sourceDex: "UNISWAP_V3",
  targetDex: "SUSHISWAP",
  borrowToken: TOKENS.USDC,
  midToken: TOKENS.WETH,
  borrowAmountWei: 500_000_000n,
  borrowAmountUsd: 500,
  grossProfitUsd: 12,
  netProfitUsd: 10.5,
  gasCostUsd: 0.8,
  flashFeeUsd: 0.4,
  slippageImpactUsd: 0.3,
  confidenceScore: 78,
  quoteAgeMs: 1000,
  quoteTimestamp: Date.now(),
  quoteDepthUsd: 20_000,
  routeDescription: "USDC->WETH on Uni then WETH->USDC on Sushi",
  firstHopOut: 100_000_000_000_000_000n,
  secondHopOut: 510_000_000n,
  firstHopUnitAmt: 200_000_000_000_000n,
  secondHopUnitAmt: 5_100_000_000n,
  uniswapFeeTier: 500,
};

function createMockDsa() {
  const adds: Array<{ connector: string; method: string; args: unknown[] }> = [];
  const innerAdds: Array<{ connector: string; method: string; args: unknown[] }> = [];
  let firstSpell = true;

  return {
    Spell() {
      const target = firstSpell ? innerAdds : adds;
      firstSpell = false;
      return {
        add(spell: { connector: string; method: string; args: unknown[] }) {
          target.push(spell);
        },
        async cast() {
          return "0xtest";
        },
      };
    },
    internal: {
      encodeSpells() {
        return { targets: ["A", "B"], spells: ["0x01", "0x02"] };
      },
    },
    web3: {
      eth: {
        abi: {
          encodeParameters() {
            return "0xencoded";
          },
        },
      },
    },
    instance: { version: 2, chainId: MAINNET_CHAIN_ID },
    __adds: adds,
    __innerAdds: innerAdds,
  };
}

describe("scanner -> decision -> execution pipeline unit integration", () => {
  it("builds instapool flashBorrowAndCast payload", () => {
    const dsa = createMockDsa() as unknown as any;
    const flashSpell = buildFlashLoanArbSpell(dsa, opportunity, settings);
    expect(flashSpell).toBeDefined();
    expect(dsa.__adds.length).toBe(1);
    expect(dsa.__adds[0].connector).toBe("INSTAPOOL-C");
    expect(dsa.__adds[0].method).toBe("flashBorrowAndCast");
    expect(dsa.__innerAdds.some((s: any) => s.connector === "INSTAPOOL-C" && s.method === "flashPayback")).toBe(
      true
    );
  });

  it("builds flashBorrowAndCast payload for liquidation unwind", () => {
    const dsa = createMockDsa() as unknown as any;
    const liquidationParams = {
      debtToken: TOKENS.USDC.address,
      collateralToken: TOKENS.WETH.address,
      repayAmountWei: 200_000000n,
      withdrawAmountWei: 100000000000000000n,
      rateMode: 2,
      uniswapFeeTier: 500,
      maxSlippageBps: 40,
    };
    const flashSpell = buildFlashLoanLiquidationSpell(dsa, liquidationParams);
    expect(flashSpell).toBeDefined();
    expect(dsa.__adds.length).toBe(1);
    expect(dsa.__adds[0].method).toBe("flashBorrowAndCast");
    expect(dsa.__innerAdds.some((s: any) => s.connector === "AAVE-V3-A" && s.method === "payback")).toBe(true);
    expect(dsa.__innerAdds.some((s: any) => s.connector === "AAVE-V3-A" && s.method === "withdraw")).toBe(true);
    expect(dsa.__innerAdds.some((s: any) => s.connector === "INSTAPOOL-C" && s.method === "flashPayback")).toBe(
      true
    );
    // Assert Uniswap sell: sell(buyAddr=debtToken, sellAddr=collateralToken, fee, unitAmt, sellAmt, 0, 0)
    const uniswapSell = dsa.__innerAdds.find(
      (s: any) => s.connector === "UNISWAP-V3-SWAP-A" && s.method === "sell"
    );
    expect(uniswapSell).toBeDefined();
    expect(uniswapSell.args[0]).toBe(liquidationParams.debtToken);      // buyAddr: token to receive
    expect(uniswapSell.args[1]).toBe(liquidationParams.collateralToken); // sellAddr: token to sell
    expect(uniswapSell.args[2]).toBe(liquidationParams.uniswapFeeTier); // fee
    expect(BigInt(uniswapSell.args[3])).toBeGreaterThan(0n);             // unitAmt: slippage floor
    expect(uniswapSell.args[4]).toBe(liquidationParams.withdrawAmountWei.toString()); // sellAmt
  });
});
