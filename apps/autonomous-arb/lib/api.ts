import { Prisma, type DsaAccount, type Execution, type Opportunity, type StrategySettings } from "@prisma/client";
import { isAddress } from "viem";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./defaults";
import { MAINNET_CHAIN_ID, MAINNET_ONLY_ERROR } from "./chain";

export function toJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonOk(data: unknown, status = 200): Response {
  return toJson({ ok: true, ...((data as Record<string, unknown>) ?? {}) }, status);
}

export function toJsonError(error: string, status = 400): Response {
  return toJson({ ok: false, error }, status);
}

export async function parseJson<T = unknown>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  return parseJson<T>(request);
}

export async function upsertUser(wallet: string) {
  return db.user.upsert({
    where: { wallet: wallet.toLowerCase() },
    update: {},
    create: { wallet: wallet.toLowerCase() },
  });
}

export async function getOrCreateUser(wallet: string) {
  return upsertUser(wallet);
}

export async function createUserIfMissing(wallet: string) {
  return upsertUser(wallet);
}

export async function createUserWithDefaults(wallet: string) {
  const user = await upsertUser(wallet);
  return user;
}

export function getUserWallet(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return isAddress(lower) ? lower : null;
}

export function parseWalletFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("wallet");
  if (fromQuery && isAddress(fromQuery)) return fromQuery.toLowerCase();
  return null;
}

export function normalizeWalletSafe(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isAddress(value)) return null;
  return value.toLowerCase();
}

export function ensureChecksumAddress(value: unknown, field: string): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value as `0x${string}`;
}

export function ensureMainnetRequest(req: Request): { ok: true } | { ok: false; error: string } {
  const chainIdHeader = req.headers.get("x-chain-id");
  if (!chainIdHeader) return { ok: true };
  const chainId = Number(chainIdHeader);
  if (!Number.isInteger(chainId) || chainId !== MAINNET_CHAIN_ID) {
    return { ok: false, error: MAINNET_ONLY_ERROR };
  }
  return { ok: true };
}

export async function ensureDefaultSettings(userId: string, dsaAccountId: string): Promise<StrategySettings> {
  const existing = await db.strategySettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.strategySettings.create({
    data: {
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

export async function getUserBundle(wallet: string): Promise<{
  user: Awaited<ReturnType<typeof upsertUser>>;
  dsaAccounts: DsaAccount[];
  settings: StrategySettings | null;
  opportunities: Opportunity[];
  executions: Execution[];
}> {
  const user = await upsertUser(wallet);
  const [dsaAccounts, settings, opportunities, executions] = await Promise.all([
    db.dsaAccount.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.strategySettings.findUnique({ where: { userId: user.id } }),
    db.opportunity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.execution.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return { user, dsaAccounts, settings, opportunities, executions };
}

export function parseAllowedPairsInput(input: string): string[] {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
