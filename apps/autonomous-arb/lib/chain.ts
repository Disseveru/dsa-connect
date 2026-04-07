import { arbitrum } from "viem/chains";

export const MAINNET_CHAIN_ID = 42161;
export const ETH_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const DSA_GENESIS_ORIGIN = "0x0000000000000000000000000000000000000000";

export const DSA_CORE = {
  index: "0x1eE00C305C51Ff3bE60162456A9B533C07cD9288",
  accountProxy: "0x857f3b524317C0C403EC40e01837F1B160F9E7Ab",
  accountDefault: "0x0C25490d97594D513Fd8a80C51e4900252fA18bF",
};

export const DSA_CONNECTORS = {
  authority: "AUTHORITY-A",
  instapool: "INSTAPOOL-C",
  uniswapV3Swap: "UNISWAP-V3-SWAP-A",
  sushiswap: "SUSHISWAP-A",
} as const;

export const TOKENS = {
  WETH: {
    symbol: "WETH",
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    decimals: 18,
  },
  USDC: {
    symbol: "USDC",
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e583",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9",
    decimals: 6,
  },
  DAI: {
    symbol: "DAI",
    address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    decimals: 18,
  },
} as const;

export const DEFAULT_ALLOWED_PAIRS = [
  `${TOKENS.USDC.address}:${TOKENS.WETH.address}`,
  `${TOKENS.USDT.address}:${TOKENS.WETH.address}`,
];

export const DEFAULT_PER_TOKEN_EXPOSURE = {
  [TOKENS.USDC.address.toLowerCase()]: 3000,
  [TOKENS.USDT.address.toLowerCase()]: 3000,
  [TOKENS.WETH.address.toLowerCase()]: 5_000,
};

export const MAINNET_ONLY_ERROR =
  "Mainnet-only mode: this service supports Arbitrum mainnet (chainId 42161) exclusively.";

export function ensureArbitrumMainnet(chainId: number) {
  if (chainId !== MAINNET_CHAIN_ID) throw new Error(MAINNET_ONLY_ERROR);
}

export const arbiscanTxUrl = (hash: string) => `https://arbiscan.io/tx/${hash}`;

export const appChain = arbitrum;
