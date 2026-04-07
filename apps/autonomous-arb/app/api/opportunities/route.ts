import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ ok: true, items: [] });
  const user = await prisma.user.findUnique({ where: { wallet: wallet.toLowerCase() } });
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
}
