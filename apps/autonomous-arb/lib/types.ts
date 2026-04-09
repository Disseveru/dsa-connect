export type TokenConfig = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

export type DexName = "UNISWAP_V3" | "SUSHISWAP";

export type RouteQuote = {
  dex: DexName;
  amountIn: bigint;
  amountOut: bigint;
  gasEstimate: bigint;
  liquidityScore: number;
  timestamp: number;
};

export type ArbitrageOpportunity = {
  id?: string;
  sourceDex: DexName;
  targetDex: DexName;
  borrowToken: TokenConfig;
  midToken: TokenConfig;
  borrowAmountWei: bigint;
  borrowAmountUsd: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  gasCostUsd: number;
  flashFeeUsd: number;
  slippageImpactUsd: number;
  confidenceScore: number;
  quoteAgeMs: number;
  routeDescription: string;
  firstHopOut: bigint;
  secondHopOut: bigint;
  firstHopUnitAmt: bigint;
  secondHopUnitAmt: bigint;
  uniswapFeeTier: number;
  routeAFeeBps?: number;
  routeBFeeBps?: number;
  estimatedGasUnits?: number;
  estimatedGas?: number;
  quoteTimestamp?: number;
  quoteDepthUsd?: number;
};

export type AllowedPair = {
  borrowToken: `0x${string}`;
  midToken: `0x${string}`;
};

export type AllowedPairInput = {
  borrowToken: string;
  midToken: string;
};

export type StrategyMode = "ARBITRAGE" | "LIQUIDATION" | "HYBRID";

export type StrategySettingsShape = {
  id: string;
  userId?: string;
  dsaAccountId?: string;
  enabled: boolean;
  strategyPaused: boolean;
  strategyMode: StrategyMode;
  minNetProfitUsd: number;
  maxSlippageBps: number;
  gasCeilingGwei: number;
  maxPositionUsd: number;
  liquidationHealthFactor: number;
  liquidationDebtToken: `0x${string}` | null;
  liquidationCollateralToken: `0x${string}` | null;
  liquidationRepayAmount: number | null;
  liquidationWithdrawAmount: number | null;
  liquidationRateMode: number;
  allowedPairs: string[];
  cooldownSeconds: number;
  dailyLossCapUsd: number;
  perTokenExposureUsd: Record<string, number>;
  quoteStaleAfterMs: number;
  liquidityDepthBps: number;
  consecutiveFailureLimit: number;
  consecutiveFailures: number;
  lastExecutedAt: Date | null;
};

export type RiskContext = {
  globalPaused: boolean;
  dailyRealizedPnlUsd: number;
  tokenExposureUsd: Record<string, number>;
  nowMs: number;
};

export type ExecutionInput = {
  dsaId: number;
  dsaAddress: `0x${string}`;
  userId: string;
  settingsId: string;
  opportunity: ArbitrageOpportunity;
};
