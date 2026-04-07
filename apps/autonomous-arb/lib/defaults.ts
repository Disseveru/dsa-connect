import { DEFAULT_ALLOWED_PAIRS, DEFAULT_PER_TOKEN_EXPOSURE } from "./chain";

export const DEFAULT_SETTINGS = {
  enabled: false,
  strategyPaused: false,
  minNetProfitUsd: 10,
  maxSlippageBps: 40,
  gasCeilingGwei: 0.2,
  maxPositionUsd: 500,
  allowedPairs: DEFAULT_ALLOWED_PAIRS,
  cooldownSeconds: 60,
  dailyLossCapUsd: 100,
  perTokenExposureUsd: DEFAULT_PER_TOKEN_EXPOSURE,
  quoteStaleAfterMs: 15000,
  liquidityDepthBps: 700,
  consecutiveFailureLimit: 3,
};
