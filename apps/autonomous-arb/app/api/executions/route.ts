import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMainnet } from "@/lib/state";

export async function GET(request: NextRequest) {
  try {
    ensureMainnet();
    const userWallet = request.nextUrl.searchParams.get("wallet");
    if (!userWallet) return NextResponse.json({ error: "Missing user" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { wallet: userWallet.toLowerCase() },
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch executions" },
      { status: 500 }
    );
  }
}
