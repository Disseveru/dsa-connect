import crypto from "crypto";
import { verifyMessage } from "viem";
import { MAINNET_CHAIN_ID } from "./chain";
import { getServerEnv } from "./env";

type AuthPayload = {
  wallet: string;
  exp: number;
  nonce?: string;
};

export const AUTH_SESSION_COOKIE = "arb_session";
export const AUTH_CHALLENGE_COOKIE = "arb_challenge";

function getCookieHeader(request: Request): string {
  return request.headers.get("cookie") ?? "";
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey || !rest.length) continue;
    const rawValue = rest.join("=");
    try {
      out[rawKey] = decodeURIComponent(rawValue);
    } catch {
      // Ignore malformed cookie values and treat them as absent.
      continue;
    }
  }
  return out;
}

function sign(input: string): string {
  const env = getServerEnv();
  return crypto.createHmac("sha256", env.AUTH_SESSION_SECRET).update(input).digest("hex");
}

function encode(payload: AuthPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

function decode(token: string): AuthPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthPayload;
    if (!payload.wallet || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildSignInMessage(wallet: string, nonce: string): string {
  return [
    "Arbitrum Autonomous DSA Arbitrage Sign-In",
    "",
    `Wallet: ${wallet.toLowerCase()}`,
    `Nonce: ${nonce}`,
    `Chain ID: ${MAINNET_CHAIN_ID}`,
    "Purpose: authenticate dashboard management actions.",
  ].join("\n");
}

export function createChallengeToken(wallet: string, nonce: string): string {
  const env = getServerEnv();
  return encode({
    wallet: wallet.toLowerCase(),
    nonce,
    exp: Date.now() + env.AUTH_CHALLENGE_TTL_SECONDS * 1000,
  });
}

export function createSessionToken(wallet: string): string {
  const env = getServerEnv();
  return encode({
    wallet: wallet.toLowerCase(),
    exp: Date.now() + env.AUTH_SESSION_TTL_SECONDS * 1000,
  });
}

export function readChallengeFromRequest(request: Request): AuthPayload | null {
  const cookies = parseCookies(getCookieHeader(request));
  const token = cookies[AUTH_CHALLENGE_COOKIE];
  if (!token) return null;
  return decode(token);
}

export function readSessionWallet(request: Request): string | null {
  const cookies = parseCookies(getCookieHeader(request));
  const token = cookies[AUTH_SESSION_COOKIE];
  if (!token) return null;
  const payload = decode(token);
  if (!payload) return null;
  return payload.wallet.toLowerCase();
}

export function requireAuthenticatedWallet(request: Request): string {
  const wallet = readSessionWallet(request);
  if (!wallet) throw new Error("Unauthorized");
  return wallet;
}

export function requireAdminWallet(request: Request): string {
  const wallet = requireAuthenticatedWallet(request);
  const env = getServerEnv();
  const admins = env.ADMIN_WALLETS.split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(wallet)) throw new Error("Forbidden");
  return wallet;
}

export async function verifyWalletSignature(params: {
  wallet: `0x${string}`;
  nonce: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  const message = buildSignInMessage(params.wallet, params.nonce);
  return verifyMessage({
    address: params.wallet,
    message,
    signature: params.signature,
  });
}
