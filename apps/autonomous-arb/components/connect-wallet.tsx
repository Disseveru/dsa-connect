"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWallet() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold text-white">Wallet</h2>
      <p className="mt-1 text-sm text-slate-300">
        Connect your wallet on Arbitrum mainnet to create/import your DSA and authorize autonomous execution.
      </p>
      <div className="mt-4">
        <ConnectButton />
      </div>
    </div>
  );
}
