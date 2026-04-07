import Link from "next/link";
import { ConnectWallet } from "@/components/connect-wallet";
import { HealthBadge } from "@/components/health-badge";
import { RiskDisclosure } from "@/components/risk-disclosure";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Arbitrum Autonomous Flash-Loan Arbitrage + Liquidation</h1>
          <p className="mt-2 text-sm text-slate-300">
            Instadapp DSA authority delegation + 24/7 autonomous executor for arbitrage and liquidation/deleverage flows.
          </p>
        </div>
        <HealthBadge />
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-lg font-medium text-white">Start in 3 steps</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-300">
            <li>Connect wallet and create/import your Arbitrum DSA.</li>
            <li>One-time authorize executor via AUTHORITY-A spell.</li>
            <li>Configure arbitrage and/or liquidation mode, then enable autonomous execution.</li>
          </ol>
          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-500/30"
            >
              Open Dashboard
            </Link>
            <ConnectWallet />
          </div>
        </div>
        <RiskDisclosure />
      </section>
    </main>
  );
}

