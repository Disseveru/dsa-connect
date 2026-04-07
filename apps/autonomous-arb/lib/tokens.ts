import { TOKENS } from "./chain";
import type { AllowedPair, TokenConfig } from "./types";

const tokenByAddress = Object.values(TOKENS).reduce<Record<string, TokenConfig>>((acc, token) => {
  acc[token.address.toLowerCase()] = token;
  return acc;
}, {});

export function getToken(address: string): TokenConfig {
  const token = tokenByAddress[address.toLowerCase()];
  if (!token) throw new Error(`Token not configured: ${address}`);
  return token;
}

export function parseAllowedPairs(input: unknown): AllowedPair[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (typeof entry !== "string") return null;
      const [borrowToken, midToken] = entry.split(":");
      if (!borrowToken || !midToken) return null;
      return {
        borrowToken: borrowToken as `0x${string}`,
        midToken: midToken as `0x${string}`,
      };
    })
    .filter((v): v is AllowedPair => Boolean(v));
}
