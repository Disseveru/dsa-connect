import { formatUnits, parseUnits } from "viem";

export function toFloatFromWei(value: bigint, decimals: number): number {
  return Number(formatUnits(value, decimals));
}

export function toWei(value: number, decimals: number): bigint {
  return parseUnits(value.toString(), decimals);
}

export function bpsToRatio(bps: number) {
  return bps / 10_000;
}

export function calculateUnitAmt(buyAmt: bigint, sellAmt: bigint): bigint {
  if (sellAmt === 0n) return 0n;
  return (buyAmt * 10n ** 18n) / sellAmt;
}
