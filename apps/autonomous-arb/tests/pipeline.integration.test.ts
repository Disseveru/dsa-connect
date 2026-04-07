import { describe, expect, it } from "vitest";
import { buildFlashLoanArbSpell } from "@/lib/dsa-node";
import { MAINNET_CHAIN_ID, TOKENS } from "@/lib/chain";
import type { ArbitrageOpportunity, StrategySettingsShape } from "@/lib/types";

const settings: StrategySettingsShape = {
  id: "s",
  userId: "u",
  dsaAccountId: "d",
  enabled: true,
  strategyPaused: false,
  minNetProfitUsd: 10,
  maxSlippageBps: 40,
  gasCeilingGwei: 1,
  maxPositionUsd: 500,
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
});
