import { describe, expect, it } from "vitest";
import {
  AUTH_CHALLENGE_COOKIE,
  AUTH_SESSION_COOKIE,
  createChallengeToken,
  createSessionToken,
  readChallengeFromRequest,
  readSessionWallet,
} from "@/lib/auth";

describe("auth cookie parsing", () => {
  it("reads a valid signed session cookie", () => {
    const wallet = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";
    const token = createSessionToken(wallet);
    const request = new Request("http://localhost/api/settings", {
      headers: { cookie: `${AUTH_SESSION_COOKIE}=${token}` },
    });

    expect(readSessionWallet(request)).toBe(wallet);
  });

  it("returns null instead of throwing for malformed signature length", () => {
    const request = new Request("http://localhost/api/settings", {
      headers: { cookie: `${AUTH_SESSION_COOKIE}=invalid.short` },
    });

    expect(() => readSessionWallet(request)).not.toThrow();
    expect(readSessionWallet(request)).toBeNull();
  });

  it("returns null instead of throwing for malformed URI-encoded cookies", () => {
    const request = new Request("http://localhost/api/settings", {
      headers: { cookie: `${AUTH_SESSION_COOKIE}=%E0%A4%A` },
    });

    expect(() => readSessionWallet(request)).not.toThrow();
    expect(readSessionWallet(request)).toBeNull();
  });

  it("returns null for malformed challenge signature length", () => {
    const request = new Request("http://localhost/api/auth/verify", {
      headers: { cookie: `${AUTH_CHALLENGE_COOKIE}=invalid.short` },
    });

    expect(() => readChallengeFromRequest(request)).not.toThrow();
    expect(readChallengeFromRequest(request)).toBeNull();
  });

  it("reads a valid challenge cookie", () => {
    const wallet = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";
    const token = createChallengeToken(wallet, "nonce123");
    const request = new Request("http://localhost/api/auth/verify", {
      headers: { cookie: `${AUTH_CHALLENGE_COOKIE}=${token}` },
    });

    expect(readChallengeFromRequest(request)).toMatchObject({ wallet, nonce: "nonce123" });
  });
});
