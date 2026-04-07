import { DEFAULT_ALLOWED_PAIRS, DEFAULT_PER_TOKEN_EXPOSURE } from "./chain";

export const DEFAULT_SETTINGS = {
  enabled: false,
  strategyPaused: false,
  strategyMode: "ARBITRAGE" as const,
  minNetProfitUsd: 10,
  maxSlippageBps: 40,
  gasCeilingGwei: 0.2,
  maxPositionUsd: 500,
  liquidationHealthFactor: 1.05,
  liquidationDebtToken: null as string | null,
  liquidationCollateralToken: null as string | null,
  liquidationRepayAmount: null as number | null,
  liquidationWithdrawAmount: null as number | null,
  liquidationRateMode: 2,
  allowedPairs: DEFAULT_ALLOWED_PAIRS,
  cooldownSeconds: 60,
  dailyLossCapUsd: 100,
  perTokenExposureUsd: DEFAULT_PER_TOKEN_EXPOSURE,
  quoteStaleAfterMs: 15000,
  liquidityDepthBps: 700,
  consecutiveFailureLimit: 3,
};
