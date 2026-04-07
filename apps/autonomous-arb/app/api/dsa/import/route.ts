import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { createUserIfMissing, getOrCreateSettingsForDsa, upsertDsaAccount } from "@/lib/state";
import { MAINNET_CHAIN_ID } from "@/lib/chain";
import { ensureChecksumAddress } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const walletInput = (body as Record<string, unknown>).wallet;
    const wallet = walletInput ? ensureChecksumAddress(walletInput, "wallet").toLowerCase() : actingWallet;
    if (wallet !== actingWallet) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const dsaAddress = ensureChecksumAddress((body as Record<string, unknown>).dsaAddress, "dsaAddress");
    const dsaIdRaw = Number((body as Record<string, unknown>).dsaId);
    if (!Number.isInteger(dsaIdRaw) || dsaIdRaw <= 0) {
      return NextResponse.json({ error: "Invalid dsaId" }, { status: 400 });
    }
    const user = await createUserIfMissing(wallet);
    const dsa = await upsertDsaAccount({
      userId: user.id,
      dsaId: dsaIdRaw,
      address: dsaAddress,
      version: 2,
      authorityEnabled: false,
      executorAuthority: null,
    });
    await getOrCreateSettingsForDsa(user.id, dsa.id);
    return NextResponse.json({ ok: true, dsa, chainId: MAINNET_CHAIN_ID });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status });
  }
}
