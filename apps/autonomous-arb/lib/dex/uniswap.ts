import { publicClient } from "../clients";
import {
  UNISWAP_V3_FACTORY_ABI,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_QUOTER_V2_ABI,
} from "../abis";
import { getServerEnv } from "../env";
import type { RouteQuote } from "../types";

const env = getServerEnv();
const feeTiers = [500, 3000, 10_000];

type UniswapQuote = Omit<RouteQuote, "dex"> & { dex: "UNISWAP_V3"; feeTier: number };

export async function quoteUniswapV3ExactIn(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint
): Promise<UniswapQuote | null> {
  const now = Date.now();
  const settled: Array<UniswapQuote | null> = await Promise.all(
    feeTiers.map(async (feeTier) => {
      try {
        const quoteResult = (await publicClient.readContract({
          address: env.UNISWAP_V3_QUOTER_V2 as `0x${string}`,
          abi: UNISWAP_V3_QUOTER_V2_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn,
              tokenOut,
              amountIn,
              fee: feeTier,
              sqrtPriceLimitX96: 0n,
            },
          ],
        })) as unknown as readonly [bigint, bigint, number, bigint];
        const amountOut = quoteResult[0];
        const gasEstimate = quoteResult[3];

        const pool = await publicClient.readContract({
          address: env.UNISWAP_V3_FACTORY as `0x${string}`,
          abi: UNISWAP_V3_FACTORY_ABI,
          functionName: "getPool",
          args: [tokenIn, tokenOut, feeTier],
        });

        let liquidityScore = 0;
        if (pool !== "0x0000000000000000000000000000000000000000") {
          const liquidity = await publicClient.readContract({
            address: pool,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: "liquidity",
          });
          liquidityScore = Number(liquidity) / 1e24;
        }

        return {
          dex: "UNISWAP_V3" as const,
          amountIn,
          amountOut,
          gasEstimate,
          liquidityScore,
          feeTier,
          timestamp: now,
        };
      } catch {
        return null;
      }
    })
  );

  const valid = settled.filter((item): item is UniswapQuote => item !== null);
  valid.sort((a, b) => Number(b.amountOut - a.amountOut));
  return valid[0] ?? null;
}
