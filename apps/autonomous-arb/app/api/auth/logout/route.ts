import { NextRequest, NextResponse } from "next/server";
import { AUTH_CHALLENGE_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

export async function POST(_req: NextRequest) {
  const env = getServerEnv();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
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
