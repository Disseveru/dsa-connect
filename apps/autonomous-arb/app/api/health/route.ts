import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertMainnetClients } from "@/lib/clients";
import { getGlobalState } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  await assertMainnetClients();
  const [global, heartbeat] = await Promise.all([
    getGlobalState(),
    db.workerHeartbeat.findUnique({ where: { id: "arb-worker" } }),
  ]);
  const lastSeen = heartbeat?.lastSeenAt ?? null;
  const alive = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 60_000 : false;
  return NextResponse.json({
    ok: true,
    mainnet: true,
    chainId: 42161,
    globalPaused: global.globalPaused,
    pauseReason: global.pauseReason,
    worker: {
      alive,
      lastSeenAt: lastSeen,
      status: alive ? "running" : "offline",
    },
  });
}
