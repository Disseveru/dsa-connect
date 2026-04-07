import { TOKENS } from "./chain";
import { quoteUniswapV3ExactIn } from "./dex/uniswap";
import { parseUnits } from "viem";

const STABLES = new Set([
  TOKENS.USDC.address.toLowerCase(),
  TOKENS.USDT.address.toLowerCase(),
  TOKENS.DAI.address.toLowerCase(),
]);

export async function getTokenUsdPrice(
  tokenAddress: `0x${string}`,
  tokenDecimals: number
): Promise<number> {
  if (STABLES.has(tokenAddress.toLowerCase())) return 1;

  if (tokenAddress.toLowerCase() === TOKENS.WETH.address.toLowerCase()) {
    const oneEth = parseUnits("1", 18);
    const quote = await quoteUniswapV3ExactIn(
      TOKENS.WETH.address as `0x${string}`,
      TOKENS.USDC.address as `0x${string}`,
      oneEth
    );
    if (!quote) throw new Error("Unable to quote WETH/USD");
    return Number(quote.amountOut) / 1e6;
  }

  // Generic fallback: token -> USDC via Uniswap V3
  const amount = parseUnits("1", tokenDecimals);
  const quote = await quoteUniswapV3ExactIn(tokenAddress, TOKENS.USDC.address as `0x${string}`, amount);
  if (!quote) throw new Error(`Unable to quote USD price for ${tokenAddress}`);
  return Number(quote.amountOut) / 1e6;
}
