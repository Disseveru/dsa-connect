import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const actingWallet = requireAuthenticatedWallet(request);
    const requestedWallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
    if (requestedWallet && requestedWallet !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const user = await prisma.user.findUnique({ where: { wallet: actingWallet } });
    if (!user) return NextResponse.json({ ok: true, items: [] });
    const opportunities = await prisma.opportunity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const items = opportunities.map((o) => ({
      id: o.id,
      route: `${o.sourceDex}->${o.targetDex}`,
      grossProfitUsd: o.grossProfitUsd.toString(),
      netProfitUsd: o.netProfitUsd.toString(),
      gasCostUsd: o.gasCostUsd.toString(),
      confidence: o.confidenceScore.toString(),
      ageMs: Date.now() - o.createdAt.getTime(),
      executable: o.executable,
      createdAt: o.createdAt.toISOString(),
    }));
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch opportunities" }, { status });
  }
}
