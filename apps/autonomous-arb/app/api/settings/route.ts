import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAddress } from "viem";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { getOrCreateUser, parseJsonBody } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { parseAllowedPairs } from "@/lib/tokens";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(request);
    const requestedWallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
    if (requestedWallet && requestedWallet !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const user = await getOrCreateUser(actingWallet);

    const [latest, global, dsa] = await Promise.all([
      prisma.strategySettings.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.globalState.findUnique({ where: { id: 1 } }),
      prisma.dsaAccount.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return NextResponse.json({
      ok: true,
      globalPaused: global?.globalPaused ?? false,
      settings: latest
        ? {
            ...latest,
            strategyMode: latest.strategyMode,
            minNetProfitUsd: latest.minNetProfitUsd.toString(),
            gasCeilingGwei: latest.gasCeilingGwei.toString(),
            maxPositionUsd: latest.maxPositionUsd.toString(),
            liquidationHealthFactor: latest.liquidationHealthFactor.toString(),
            liquidationDebtToken: latest.liquidationDebtToken,
            liquidationCollateralToken: latest.liquidationCollateralToken,
            liquidationRepayAmount: latest.liquidationRepayAmount?.toString() ?? null,
            liquidationWithdrawAmount: latest.liquidationWithdrawAmount?.toString() ?? null,
            liquidationRateMode: latest.liquidationRateMode,
            dailyLossCapUsd: latest.dailyLossCapUsd.toString(),
            dsaId: dsa?.dsaId ?? null,
            dsaAddress: dsa?.address ?? null,
            authorityEnabled: dsa?.authorityEnabled ?? false,
            executorAuthority: dsa?.executorAuthority ?? null,
          }
        : null,
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch settings" }, { status });
  }
}

type SettingsBody = {
  wallet?: string;
  dsaId?: number;
  enabled?: boolean;
  strategyPaused?: boolean;
  strategyMode?: "ARBITRAGE" | "LIQUIDATION" | "HYBRID";
  minNetProfitUsd?: number;
  maxSlippageBps?: number;
  gasCeilingGwei?: number;
  maxPositionUsd?: number;
  liquidationHealthFactor?: number;
  liquidationDebtToken?: string | null;
  liquidationCollateralToken?: string | null;
  liquidationRepayAmount?: number | null;
  liquidationWithdrawAmount?: number | null;
  liquidationRateMode?: number;
  allowedPairs?: string[];
  cooldownSeconds?: number;
  dailyLossCapUsd?: number;
  perTokenExposureUsd?: Record<string, number>;
  quoteStaleAfterMs?: number;
  liquidityDepthBps?: number;
  consecutiveFailureLimit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(request);
    const body = await parseJsonBody<SettingsBody>(request);
    if (body.wallet && body.wallet.toLowerCase() !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const user = await getOrCreateUser(actingWallet);
    const dsa = await prisma.dsaAccount.findFirst({
      where: { userId: user.id, ...(body.dsaId ? { dsaId: body.dsaId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    if (!dsa) return NextResponse.json({ error: "DSA not found" }, { status: 404 });

    const allowedPairs = body.allowedPairs ?? DEFAULT_SETTINGS.allowedPairs;
    if (!parseAllowedPairs(allowedPairs).length) {
      return NextResponse.json({ error: "allowedPairs must include tokenA:tokenB entries" }, { status: 400 });
    }

    const validModes = new Set(["ARBITRAGE", "LIQUIDATION", "HYBRID"]);
    if (body.strategyMode && !validModes.has(body.strategyMode)) {
      return NextResponse.json({ error: "strategyMode must be ARBITRAGE, LIQUIDATION, or HYBRID" }, { status: 400 });
    }
    if (body.liquidationDebtToken && !isAddress(body.liquidationDebtToken)) {
      return NextResponse.json({ error: "liquidationDebtToken must be a valid address" }, { status: 400 });
    }
    if (body.liquidationCollateralToken && !isAddress(body.liquidationCollateralToken)) {
      return NextResponse.json({ error: "liquidationCollateralToken must be a valid address" }, { status: 400 });
    }

    const settings = await prisma.strategySettings.upsert({
      where: { dsaAccountId: dsa.id },
      update: {
        enabled: body.enabled ?? undefined,
        strategyPaused: body.strategyPaused ?? undefined,
        strategyMode: body.strategyMode ?? undefined,
        minNetProfitUsd:
          body.minNetProfitUsd != null ? new Prisma.Decimal(body.minNetProfitUsd) : undefined,
        maxSlippageBps: body.maxSlippageBps ?? undefined,
        gasCeilingGwei:
          body.gasCeilingGwei != null ? new Prisma.Decimal(body.gasCeilingGwei) : undefined,
        maxPositionUsd:
          body.maxPositionUsd != null ? new Prisma.Decimal(body.maxPositionUsd) : undefined,
        liquidationHealthFactor:
          body.liquidationHealthFactor != null
            ? new Prisma.Decimal(body.liquidationHealthFactor)
            : undefined,
        liquidationDebtToken: body.liquidationDebtToken != null ? body.liquidationDebtToken.toLowerCase() : undefined,
        liquidationCollateralToken:
          body.liquidationCollateralToken != null ? body.liquidationCollateralToken.toLowerCase() : undefined,
        liquidationRepayAmount:
          body.liquidationRepayAmount != null ? new Prisma.Decimal(body.liquidationRepayAmount) : undefined,
        liquidationWithdrawAmount:
          body.liquidationWithdrawAmount != null ? new Prisma.Decimal(body.liquidationWithdrawAmount) : undefined,
        liquidationRateMode: body.liquidationRateMode ?? undefined,
        allowedPairs,
        cooldownSeconds: body.cooldownSeconds ?? undefined,
        dailyLossCapUsd:
          body.dailyLossCapUsd != null ? new Prisma.Decimal(body.dailyLossCapUsd) : undefined,
        perTokenExposureUsd: body.perTokenExposureUsd ?? undefined,
        quoteStaleAfterMs: body.quoteStaleAfterMs ?? undefined,
        liquidityDepthBps: body.liquidityDepthBps ?? undefined,
        consecutiveFailureLimit: body.consecutiveFailureLimit ?? undefined,
      },
      create: {
        userId: user.id,
        dsaAccountId: dsa.id,
        enabled: body.enabled ?? DEFAULT_SETTINGS.enabled,
        strategyPaused: body.strategyPaused ?? DEFAULT_SETTINGS.strategyPaused,
        strategyMode: body.strategyMode ?? DEFAULT_SETTINGS.strategyMode,
        minNetProfitUsd: new Prisma.Decimal(body.minNetProfitUsd ?? DEFAULT_SETTINGS.minNetProfitUsd),
        maxSlippageBps: body.maxSlippageBps ?? DEFAULT_SETTINGS.maxSlippageBps,
        gasCeilingGwei: new Prisma.Decimal(body.gasCeilingGwei ?? DEFAULT_SETTINGS.gasCeilingGwei),
        maxPositionUsd: new Prisma.Decimal(body.maxPositionUsd ?? DEFAULT_SETTINGS.maxPositionUsd),
        liquidationHealthFactor: new Prisma.Decimal(
          body.liquidationHealthFactor ?? DEFAULT_SETTINGS.liquidationHealthFactor
        ),
        liquidationDebtToken:
          body.liquidationDebtToken != null
            ? body.liquidationDebtToken.toLowerCase()
            : DEFAULT_SETTINGS.liquidationDebtToken,
        liquidationCollateralToken:
          body.liquidationCollateralToken != null
            ? body.liquidationCollateralToken.toLowerCase()
            : DEFAULT_SETTINGS.liquidationCollateralToken,
        liquidationRepayAmount:
          body.liquidationRepayAmount != null
            ? new Prisma.Decimal(body.liquidationRepayAmount)
            : DEFAULT_SETTINGS.liquidationRepayAmount != null
              ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationRepayAmount)
              : null,
        liquidationWithdrawAmount:
          body.liquidationWithdrawAmount != null
            ? new Prisma.Decimal(body.liquidationWithdrawAmount)
            : DEFAULT_SETTINGS.liquidationWithdrawAmount != null
              ? new Prisma.Decimal(DEFAULT_SETTINGS.liquidationWithdrawAmount)
              : null,
        liquidationRateMode: body.liquidationRateMode ?? DEFAULT_SETTINGS.liquidationRateMode,
        allowedPairs,
        cooldownSeconds: body.cooldownSeconds ?? DEFAULT_SETTINGS.cooldownSeconds,
        dailyLossCapUsd: new Prisma.Decimal(body.dailyLossCapUsd ?? DEFAULT_SETTINGS.dailyLossCapUsd),
        perTokenExposureUsd: body.perTokenExposureUsd ?? DEFAULT_SETTINGS.perTokenExposureUsd,
        quoteStaleAfterMs: body.quoteStaleAfterMs ?? DEFAULT_SETTINGS.quoteStaleAfterMs,
        liquidityDepthBps: body.liquidityDepthBps ?? DEFAULT_SETTINGS.liquidityDepthBps,
        consecutiveFailureLimit:
          body.consecutiveFailureLimit ?? DEFAULT_SETTINGS.consecutiveFailureLimit,
        consecutiveFailures: 0,
      },
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save settings" }, { status });
  }
}
