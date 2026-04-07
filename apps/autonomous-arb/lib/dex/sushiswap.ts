import { publicClient } from "../clients";
import {
  SUSHISWAP_FACTORY_ABI,
  SUSHISWAP_PAIR_ABI,
  SUSHISWAP_ROUTER_ABI,
} from "../abis";
import { getServerEnv } from "../env";
import type { RouteQuote } from "../types";

const env = getServerEnv();

export async function quoteSushiswapExactIn(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint
): Promise<RouteQuote | null> {
  try {
    const now = Date.now();
    const [amountsOut, pairAddress] = await Promise.all([
      publicClient.readContract({
        address: env.SUSHISWAP_ROUTER as `0x${string}`,
        abi: SUSHISWAP_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [amountIn, [tokenIn, tokenOut]],
      }),
      publicClient.readContract({
        address: env.SUSHISWAP_FACTORY as `0x${string}`,
        abi: SUSHISWAP_FACTORY_ABI,
        functionName: "getPair",
        args: [tokenIn, tokenOut],
      }),
    ]);

    if (pairAddress === "0x0000000000000000000000000000000000000000") return null;

    const [token0, reserves] = await Promise.all([
      publicClient.readContract({
        address: pairAddress,
        abi: SUSHISWAP_PAIR_ABI,
        functionName: "token0",
      }),
      publicClient.readContract({
        address: pairAddress,
        abi: SUSHISWAP_PAIR_ABI,
        functionName: "getReserves",
      }),
    ]);

    const reserveIn = token0.toLowerCase() === tokenIn.toLowerCase() ? reserves[0] : reserves[1];
    const liquidityScore = Number(reserveIn) / 1e24;

    return {
      dex: "SUSHISWAP",
      amountIn,
      amountOut: amountsOut[1],
      gasEstimate: 220_000n,
      liquidityScore,
      timestamp: now,
    };
  } catch {
    return null;
  }
}

export async function getSushiswapReserveIn(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`
): Promise<bigint> {
  const pairAddress = await publicClient.readContract({
    address: env.SUSHISWAP_FACTORY as `0x${string}`,
    abi: SUSHISWAP_FACTORY_ABI,
    functionName: "getPair",
    args: [tokenIn, tokenOut],
  });

  if (pairAddress === "0x0000000000000000000000000000000000000000") return 0n;

  const [token0, reserves] = await Promise.all([
    publicClient.readContract({
      address: pairAddress,
      abi: SUSHISWAP_PAIR_ABI,
      functionName: "token0",
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: SUSHISWAP_PAIR_ABI,
      functionName: "getReserves",
    }),
  ]);

  return token0.toLowerCase() === tokenIn.toLowerCase() ? reserves[0] : reserves[1];
}
