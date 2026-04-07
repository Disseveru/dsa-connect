export function RiskDisclosure() {
  return (
    <section className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
      <h3 className="mb-2 text-base font-semibold text-red-200">Risk Disclosure (Live Mainnet Trading)</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Flash-loan arbitrage and liquidation flows can lose money due to slippage, oracle drift, and failed transactions.</li>
        <li>Enabling executor authority allows delegated transactions on your DSA.</li>
        <li>Gas spikes can turn positive opportunities into losses before confirmation.</li>
        <li>This bot applies hard-stops, but no control fully eliminates loss risk.</li>
        <li>Keep your DSA balance and exposure limits conservative.</li>
      </ul>
    </section>
  );
}
