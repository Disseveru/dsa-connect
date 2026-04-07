import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { createUserIfMissing, ensureMainnetRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { createNodeDsa } from "@/lib/dsa-node";

const createSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  dsaId: z.coerce.number().int().positive().optional(),
  dsaAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  version: z.coerce.number().int().positive().default(2),
});

export async function POST(req: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(req);
    const chainCheck = ensureMainnetRequest(req);
    if (!chainCheck.ok) return NextResponse.json({ error: chainCheck.error }, { status: 400 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.wallet && parsed.data.wallet.toLowerCase() !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const user = await createUserIfMissing(actingWallet);
    let dsaId = parsed.data.dsaId;
    let dsaAddress = parsed.data.dsaAddress?.toLowerCase();

    if (!dsaId || !dsaAddress) {
      const dsa = createNodeDsa();
      const discovered = (await dsa.getAccounts?.(actingWallet)) ?? [];
      const latest = discovered[discovered.length - 1];
      if (!latest) {
        return NextResponse.json(
          { error: "No DSA found for wallet. Create one in Instadapp first, then import by ID/address." },
          { status: 400 }
        );
      }
      dsaId = latest.id;
      dsaAddress = latest.address.toLowerCase();
    }

    const account = await db.dsaAccount.upsert({
      where: {
        userId_dsaId: {
          userId: user.id,
          dsaId,
        },
      },
      update: {
        address: dsaAddress,
        version: parsed.data.version,
      },
      create: {
        userId: user.id,
        dsaId,
        address: dsaAddress,
        version: parsed.data.version,
      },
    });

    await db.strategySettings.upsert({
      where: { userId: user.id },
      update: { dsaAccountId: account.id },
      create: {
        userId: user.id,
        dsaAccountId: account.id,
        allowedPairs: DEFAULT_SETTINGS.allowedPairs,
        perTokenExposureUsd: DEFAULT_SETTINGS.perTokenExposureUsd,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create/import DSA";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
