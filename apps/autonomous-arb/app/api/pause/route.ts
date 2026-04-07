import { NextRequest } from "next/server";
import { requireAdminWallet, requireAuthenticatedWallet } from "@/lib/auth";
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
    const actingWallet = requireAuthenticatedWallet(req);

    if (body.globalPaused !== undefined) {
      requireAdminWallet(req);
      await db.globalState.upsert({
        where: { id: 1 },
        update: { globalPaused: body.globalPaused, pauseReason: body.reason ?? null },
        create: { id: 1, globalPaused: body.globalPaused, pauseReason: body.reason ?? null },
      });
    }

    if (body.strategyPaused !== undefined) {
      const user = await db.user.findUnique({ where: { wallet: actingWallet } });
      if (!user) return toJsonError("User not found", 404);
      await db.strategySettings.update({
        where: { userId: user.id },
        data: { strategyPaused: body.strategyPaused },
      });
    }

    return jsonOk({ paused: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pause update failed";
    if (message === "Unauthorized") return toJsonError(message, 401);
    if (message === "Forbidden") return toJsonError(message, 403);
    return toJsonError(message, 400);
  }
}
