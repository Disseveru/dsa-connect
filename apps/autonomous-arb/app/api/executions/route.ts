import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedWallet } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMainnet } from "@/lib/state";

export async function GET(request: NextRequest) {
  try {
    ensureMainnet();
    const actingWallet = requireAuthenticatedWallet(request);
    const requestedWallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
    if (requestedWallet && requestedWallet !== actingWallet) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { wallet: actingWallet },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ ok: true, items: [] });

    const items = await prisma.execution.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch executions" },
      { status }
    );
  }
}
