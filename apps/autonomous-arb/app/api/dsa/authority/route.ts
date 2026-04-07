import { NextRequest, NextResponse } from "next/server";
import { DSA_ACCOUNT_V2_ABI } from "@/lib/abis";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { arbiscanTxUrl, ensureArbitrumMainnet } from "@/lib/chain";
import { db } from "@/lib/db";
import { createNodeDsaForAccount } from "@/lib/dsa-node";
import { getServerEnv } from "@/lib/env";
import { ensureUserAndSettings } from "@/lib/state";
import { normalizeWallet } from "@/lib/wallet";
import { publicClient } from "@/lib/clients";

const env = getServerEnv();

async function getAccountOrThrow(wallet: string, dsaId?: number) {
  const user = await db.user.findUnique({ where: { wallet } });
  if (!user) throw new Error("User not found.");
  const account = await db.dsaAccount.findFirst({
    where: { userId: user.id, ...(dsaId ? { dsaId } : {}) },
    orderBy: { updatedAt: "desc" },
  });
  if (!account) throw new Error("DSA account not found.");
  return { user, account };
}

export async function GET(req: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(req);
    const requestedWallet = normalizeWallet(req.nextUrl.searchParams.get("wallet"));
    if (requestedWallet && requestedWallet !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const wallet = requestedWallet ?? actingWallet;
    const dsaIdParam = req.nextUrl.searchParams.get("dsaId");
    const dsaId = dsaIdParam ? Number(dsaIdParam) : undefined;

    ensureArbitrumMainnet(await publicClient.getChainId());
    const { account } = await getAccountOrThrow(wallet, dsaId);
    const isAuth = await publicClient.readContract({
      address: account.address as `0x${string}`,
      abi: DSA_ACCOUNT_V2_ABI,
      functionName: "isAuth",
      args: [env.EXECUTOR_ADDRESS as `0x${string}`],
    });

    await db.dsaAccount.update({
      where: { id: account.id },
      data: {
        authorityEnabled: Boolean(isAuth),
        executorAuthority: env.EXECUTOR_ADDRESS.toLowerCase(),
        lastAuthorityCheckAt: new Date(),
      },
    });
    return NextResponse.json({ authorityEnabled: Boolean(isAuth), executorAddress: env.EXECUTOR_ADDRESS });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authority status failed" },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { wallet?: string; dsaId?: number; action?: "enable" | "revoke" };
    const actingWallet = requireAuthenticatedWallet(req);
    const requestedWallet = normalizeWallet(body.wallet);
    if (requestedWallet && requestedWallet !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!body.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const { user, account } = await getAccountOrThrow(actingWallet, body.dsaId);
    const dsa = await createNodeDsaForAccount(account.dsaId);
    const spells = dsa.Spell();
    spells.add({
      connector: "AUTHORITY-A",
      method: body.action === "enable" ? "add" : "remove",
      args: [env.EXECUTOR_ADDRESS],
    });
    const txHash = await spells.cast();

    await db.dsaAccount.update({
      where: { id: account.id },
      data: {
        authorityEnabled: body.action === "enable",
        executorAuthority: env.EXECUTOR_ADDRESS.toLowerCase(),
        lastAuthorityCheckAt: new Date(),
      },
    });

    if (body.action === "enable") {
      await ensureUserAndSettings(actingWallet, {
        dsaId: account.dsaId,
        dsaAddress: account.address,
        version: account.version,
      });
    }

    return NextResponse.json({
      success: true,
      authorityEnabled: body.action === "enable",
      txHash,
      arbiscanUrl: arbiscanTxUrl(txHash),
      userId: user.id,
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authority update failed" },
      { status }
    );
  }
}
