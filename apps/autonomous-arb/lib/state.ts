import { Prisma } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./defaults";
import { MAINNET_CHAIN_ID } from "./chain";
import { ensureAddress, normalizeWallet } from "./wallet";

export function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0;
  return Number(v);
}

export async function getOrCreateUser(wallet: string) {
  const normalized = wallet.toLowerCase();
  return db.user.upsert({
    where: { wallet: normalized },
    update: {},
    create: { wallet: normalized },
  });
}

export async function getOrCreateGlobalState() {
  return db.globalState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, globalPaused: false },
  });
}

export async function getGlobalState() {
  return getOrCreateGlobalState();
}

export async function getSettingsByUserWallet(wallet: string) {
  const user = await getOrCreateUser(wallet);
  const activeDsa = await db.dsaAccount.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!activeDsa) return null;

  return db.strategySettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      dsaAccountId: activeDsa.id,
      enabled: DEFAULT_SETTINGS.enabled,
      strategyPaused: DEFAULT_SETTINGS.strategyPaused,
      strategyMode: DEFAULT_SETTINGS.strategyMode,
      minNetProfitUsd: new Prisma.Decimal(DEFAULT_SETTINGS.minNetProfitUsd),
      maxSlippageBps: DEFAULT_SETTINGS.maxSlippageBps,
      gasCeilingGwei: new Prisma.Decimal(DEFAULT_SETTINGS.gasCeilingGwei),
      maxPositionUsd: new Prisma.Decimal(DEFAULT_SETTINGS.maxPositionUsd),
      liquidationHealthFactor: new Prisma.Decimal(DEFAULT_SETTINGS.liquidationHealthFactor),
      liquidationDebtToken: DEFAULT_SETTINGS.liquidationDebtToken,
      liquidationCollateralToken: DEFAULT_SETTINGS.liquidationCollateralToken,
      liquidationRepayAmount:
        DEFAULT_SETTINGS.liquidationRepayAmount != null
          ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationRepayAmount)
          : null,
      liquidationWithdrawAmount:
        DEFAULT_SETTINGS.liquidationWithdrawAmount != null
          ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationWithdrawAmount)
          : null,
      liquidationRateMode: DEFAULT_SETTINGS.liquidationRateMode,
      allowedPairs: DEFAULT_SETTINGS.allowedPairs,
      cooldownSeconds: DEFAULT_SETTINGS.cooldownSeconds,
      dailyLossCapUsd: new Prisma.Decimal(DEFAULT_SETTINGS.dailyLossCapUsd),
      perTokenExposureUsd: DEFAULT_SETTINGS.perTokenExposureUsd,
      quoteStaleAfterMs: DEFAULT_SETTINGS.quoteStaleAfterMs,
      liquidityDepthBps: DEFAULT_SETTINGS.liquidityDepthBps,
      consecutiveFailureLimit: DEFAULT_SETTINGS.consecutiveFailureLimit,
    },
  });
}

export function ensureMainnet() {
  return MAINNET_CHAIN_ID === 42161;
}

export const defaultSettingsInput = DEFAULT_SETTINGS;

export async function createUserIfMissing(wallet: string) {
  return getOrCreateUser(wallet);
}

export async function upsertDsaAccount(input: {
  userId: string;
  dsaId: number;
  address: string;
  version: number;
  authorityEnabled: boolean;
  executorAuthority: string | null;
}) {
  return db.dsaAccount.upsert({
    where: {
      userId_dsaId: {
        userId: input.userId,
        dsaId: input.dsaId,
      },
    },
    update: {
      address: input.address.toLowerCase(),
      version: input.version,
      authorityEnabled: input.authorityEnabled,
      executorAuthority: input.executorAuthority,
      lastAuthorityCheckAt: new Date(),
    },
    create: {
      userId: input.userId,
      dsaId: input.dsaId,
      address: input.address.toLowerCase(),
      version: input.version,
      authorityEnabled: input.authorityEnabled,
      executorAuthority: input.executorAuthority,
      lastAuthorityCheckAt: new Date(),
    },
  });
}

export async function getOrCreateSettingsForDsa(userId: string, dsaAccountId: string) {
  return db.strategySettings.upsert({
    where: { userId },
    update: { dsaAccountId },
    create: {
      userId,
      dsaAccountId,
      enabled: DEFAULT_SETTINGS.enabled,
      strategyPaused: DEFAULT_SETTINGS.strategyPaused,
      strategyMode: DEFAULT_SETTINGS.strategyMode,
      minNetProfitUsd: new Prisma.Decimal(DEFAULT_SETTINGS.minNetProfitUsd),
      maxSlippageBps: DEFAULT_SETTINGS.maxSlippageBps,
      gasCeilingGwei: new Prisma.Decimal(DEFAULT_SETTINGS.gasCeilingGwei),
      maxPositionUsd: new Prisma.Decimal(DEFAULT_SETTINGS.maxPositionUsd),
      liquidationHealthFactor: new Prisma.Decimal(DEFAULT_SETTINGS.liquidationHealthFactor),
      liquidationDebtToken: DEFAULT_SETTINGS.liquidationDebtToken,
      liquidationCollateralToken: DEFAULT_SETTINGS.liquidationCollateralToken,
      liquidationRepayAmount:
        DEFAULT_SETTINGS.liquidationRepayAmount != null
          ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationRepayAmount)
          : null,
      liquidationWithdrawAmount:
        DEFAULT_SETTINGS.liquidationWithdrawAmount != null
          ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationWithdrawAmount)
          : null,
      liquidationRateMode: DEFAULT_SETTINGS.liquidationRateMode,
      allowedPairs: DEFAULT_SETTINGS.allowedPairs,
      cooldownSeconds: DEFAULT_SETTINGS.cooldownSeconds,
      dailyLossCapUsd: new Prisma.Decimal(DEFAULT_SETTINGS.dailyLossCapUsd),
      perTokenExposureUsd: DEFAULT_SETTINGS.perTokenExposureUsd,
      quoteStaleAfterMs: DEFAULT_SETTINGS.quoteStaleAfterMs,
      liquidityDepthBps: DEFAULT_SETTINGS.liquidityDepthBps,
      consecutiveFailureLimit: DEFAULT_SETTINGS.consecutiveFailureLimit,
    },
  });
}

export async function ensureUserAndSettings(
  wallet: string,
  input: {
    dsaId: number;
    dsaAddress: string;
    version: number;
  }
) {
  const normalizedWallet = normalizeWallet(wallet);
  if (!normalizedWallet) throw new Error("Invalid wallet");
  const normalizedAddress = ensureAddress(input.dsaAddress);
  const user = await getOrCreateUser(normalizedWallet);
  const dsa = await upsertDsaAccount({
    userId: user.id,
    dsaId: input.dsaId,
    address: normalizedAddress,
    version: input.version,
    authorityEnabled: true,
    executorAuthority: null,
  });
  const settings = await getOrCreateSettingsForDsa(user.id, dsa.id);
  return { user, dsa, settings };
}
