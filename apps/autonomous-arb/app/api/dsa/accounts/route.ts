import { NextRequest, NextResponse } from "next/server";
import { createUserWithDefaults, parseWalletFromRequest, normalizeWalletSafe } from "@/lib/api";
import { createNodeDsa } from "@/lib/dsa-node";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { DSA_ACCOUNT_V2_ABI } from "@/lib/abis";
import { publicClient } from "@/lib/clients";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const wallet = parseWalletFromRequest(req);
    if (!wallet) return NextResponse.json({ accounts: [] });
    const user = await createUserWithDefaults(wallet);
    const accounts = await db.dsaAccount.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { settings: true },
    });
    return NextResponse.json({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as { wallet?: string; dsaId?: number; dsaAddress?: string };
    const wallet = normalizeWalletSafe(json.wallet) ?? parseWalletFromRequest(req);
    if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
    const user = await createUserWithDefaults(wallet);
    const body = json;

    if (!body.dsaId && !body.dsaAddress) {
      return NextResponse.json({ error: "Provide dsaId or dsaAddress" }, { status: 400 });
    }

    let dsaId = body.dsaId;
    let dsaAddress = body.dsaAddress?.toLowerCase();
    if (!dsaId || !dsaAddress) {
      const nodeDsa = createNodeDsa();
      const accounts = (await nodeDsa.getAccounts?.(wallet)) ?? [];
      const found = accounts.find(
        (a: { id: number; address: string }) =>
          (body.dsaId ? a.id === body.dsaId : false) ||
          (body.dsaAddress ? a.address.toLowerCase() === body.dsaAddress.toLowerCase() : false)
      );
      if (!found) return NextResponse.json({ error: "DSA not found for wallet authority." }, { status: 404 });
      dsaId = found.id;
      dsaAddress = found.address.toLowerCase();
    }
    const finalDsaId = Number(dsaId);
    const finalDsaAddress = dsaAddress.toLowerCase();

    const env = getServerEnv();
    const isAuth = await publicClient.readContract({
      address: finalDsaAddress as `0x${string}`,
      abi: DSA_ACCOUNT_V2_ABI,
      functionName: "isAuth",
      args: [env.EXECUTOR_ADDRESS as `0x${string}`],
    });

    const account = await db.dsaAccount.upsert({
      where: { userId_dsaId: { userId: user.id, dsaId: finalDsaId } },
      update: {
        address: finalDsaAddress,
        authorityEnabled: isAuth,
        executorAuthority: env.EXECUTOR_ADDRESS.toLowerCase(),
        lastAuthorityCheckAt: new Date(),
      },
      create: {
        userId: user.id,
        dsaId: finalDsaId,
        address: finalDsaAddress,
        authorityEnabled: isAuth,
        executorAuthority: env.EXECUTOR_ADDRESS.toLowerCase(),
      },
      include: { settings: true },
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
