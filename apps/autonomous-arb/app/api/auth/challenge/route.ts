import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  AUTH_CHALLENGE_COOKIE,
  buildSignInMessage,
  createChallengeToken,
} from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { wallet?: string } | null;
  const wallet = body?.wallet?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ ok: false, error: "Valid wallet is required" }, { status: 400 });
  }

  const env = getServerEnv();
  const nonce = randomBytes(16).toString("hex");
  const token = createChallengeToken(wallet, nonce);
  const message = buildSignInMessage(wallet, nonce);

  const response = NextResponse.json({ ok: true, nonce, message });
  response.cookies.set(AUTH_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.AUTH_CHALLENGE_TTL_SECONDS,
  });
  return response;
}
