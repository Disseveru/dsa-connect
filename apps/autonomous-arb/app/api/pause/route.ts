import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonOk, parseJson, toJsonError } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  strategyPaused: z.boolean().optional(),
  globalPaused: z.boolean().optional(),
  reason: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await parseJson(req));
    const userAddress = req.nextUrl.searchParams.get("userAddress")?.toLowerCase();

    if (body.globalPaused !== undefined) {
      await db.globalState.upsert({
        where: { id: 1 },
        update: { globalPaused: body.globalPaused, pauseReason: body.reason ?? null },
        create: { id: 1, globalPaused: body.globalPaused, pauseReason: body.reason ?? null },
      });
    }

    if (body.strategyPaused !== undefined) {
      if (!userAddress) return toJsonError("Missing userAddress for strategy pause", 400);
      const user = await db.user.findUnique({ where: { wallet: userAddress } });
      if (!user) return toJsonError("User not found", 404);
      await db.strategySettings.update({
        where: { userId: user.id },
        data: { strategyPaused: body.strategyPaused },
      });
    }

    return jsonOk({ paused: true });
  } catch (error) {
    return toJsonError(error instanceof Error ? error.message : "Pause update failed", 400);
  }
}
