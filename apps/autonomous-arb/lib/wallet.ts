import { isAddress } from "viem";

export function normalizeWallet(value?: string | null): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

export function ensureAddress(value: unknown): string {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error("Invalid address");
  }
  return value.toLowerCase();
}

