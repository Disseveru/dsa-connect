import type { StrategySettings } from "@prisma/client";
import { formatUnits, isAddress, parseUnits } from "viem";
import { AAVE_V3_POOL_ABI } from "./abis";
import { publicClient } from "./clients";
import { buildFlashLoanLiquidationSpell, type FlashLoanLiquidationConfig } from "./dsa-node";
import { getServerEnv } from "./env";
import { getToken } from "./tokens";

type LiquidationReadiness = {
  trigger: boolean;
  healthFactor: number;
  reason?: string;
  config?: FlashLoanLiquidationConfig;
  summary?: string;
};

function buildConfigFromSettings(settings: StrategySettings): {
  config?: FlashLoanLiquidationConfig;
  summary?: string;
  reason?: string;
} {
  if (!settings.liquidationDebtToken || !settings.liquidationCollateralToken) {
    return { reason: "Liquidation tokens are not configured." };
  }
  if (!isAddress(settings.liquidationDebtToken) || !isAddress(settings.liquidationCollateralToken)) {
    return { reason: "Liquidation token addresses are invalid." };
  }
  const repayAmountStr = settings.liquidationRepayAmount?.toString() ?? "0";
  const withdrawAmountStr = settings.liquidationWithdrawAmount?.toString() ?? "0";
  const repayAmount = Number(repayAmountStr);
  const withdrawAmount = Number(withdrawAmountStr);
  if (repayAmount <= 0 || withdrawAmount <= 0) {
    return { reason: "Liquidation repay/withdraw amounts must be greater than zero." };
  }

  let debtToken;
  let collateralToken;
  try {
    debtToken = getToken(settings.liquidationDebtToken);
    collateralToken = getToken(settings.liquidationCollateralToken);
  } catch {
    return { reason: "Liquidation tokens must be from the supported token list." };
  }

  const config: FlashLoanLiquidationConfig = {
    debtToken: debtToken.address,
    collateralToken: collateralToken.address,
    repayAmountWei: parseUnits(repayAmountStr, debtToken.decimals),
    withdrawAmountWei: parseUnits(withdrawAmountStr, collateralToken.decimals),
    rateMode: settings.liquidationRateMode,
    uniswapFeeTier: getServerEnv().LIQUIDATION_UNISWAP_FEE_TIER,
    maxSlippageBps: settings.maxSlippageBps,
  };
  const summary = `${debtToken.symbol}/${collateralToken.symbol} repay=${repayAmount} withdraw=${withdrawAmount}`;
  return { config, summary };
}

export async function readAaveHealthFactor(dsaAddress: `0x${string}`): Promise<number> {
  const accountData = await publicClient.readContract({
    address: getServerEnv().AAVE_V3_POOL as `0x${string}`,
    abi: AAVE_V3_POOL_ABI,
    functionName: "getUserAccountData",
    args: [dsaAddress],
  });
  const healthFactor = accountData[5] as bigint;
  return Number(formatUnits(healthFactor, 18));
}

export async function evaluateLiquidationReadiness(
  settings: StrategySettings,
  dsaAddress: `0x${string}`
): Promise<LiquidationReadiness> {
  const built = buildConfigFromSettings(settings);
  if (!built.config) {
    return { trigger: false, healthFactor: Infinity, reason: built.reason };
  }
  const healthFactor = await readAaveHealthFactor(dsaAddress);
  const threshold = Number(settings.liquidationHealthFactor?.toString() ?? "0");
  if (!Number.isFinite(healthFactor) || healthFactor <= 0) {
    return { trigger: false, healthFactor, reason: "Aave health factor unavailable." };
  }
  if (healthFactor > threshold) {
    return { trigger: false, healthFactor, config: built.config, summary: built.summary };
  }
  return { trigger: true, healthFactor, config: built.config, summary: built.summary };
}

export { buildFlashLoanLiquidationSpell };
