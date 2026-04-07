import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  AUTH_CHALLENGE_COOKIE,
  AUTH_SESSION_COOKIE,
  createSessionToken,
  readChallengeFromRequest,
  verifyWalletSignature,
} from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { wallet?: string; nonce?: string; signature?: string }
    | null;
  const wallet = body?.wallet?.toLowerCase();
  const nonce = body?.nonce;
  const signature = body?.signature;

  if (!wallet || !nonce || !signature || !isAddress(wallet)) {
    return NextResponse.json({ ok: false, error: "wallet, nonce and signature are required" }, { status: 400 });
  }

  const challenge = readChallengeFromRequest(req);
  if (!challenge || !challenge.nonce) {
    return NextResponse.json({ ok: false, error: "Missing or expired challenge" }, { status: 401 });
  }
  if (challenge.wallet !== wallet || challenge.nonce !== nonce) {
    return NextResponse.json({ ok: false, error: "Challenge mismatch" }, { status: 401 });
  }

  const isValid = await verifyWalletSignature({
    wallet: wallet as `0x${string}`,
    nonce,
    signature: signature as `0x${string}`,
  });
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const env = getServerEnv();
  const sessionToken = createSessionToken(wallet);
  const response = NextResponse.json({ ok: true, wallet });

  response.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.AUTH_SESSION_TTL_SECONDS,
  });
  response.cookies.set(AUTH_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
