export const UNISWAP_V3_QUOTER_V2_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "quoteExactInputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const UNISWAP_V3_FACTORY_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getPool",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

export const UNISWAP_V3_POOL_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "liquidity",
    inputs: [],
    outputs: [{ name: "", type: "uint128" }],
  },
] as const;

export const SUSHISWAP_ROUTER_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getAmountsOut",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const SUSHISWAP_FACTORY_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getPair",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

export const SUSHISWAP_PAIR_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "getReserves",
    inputs: [],
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "token0",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const DSA_ACCOUNT_V2_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "isAuth",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
