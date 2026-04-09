"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectWallet } from "@/components/connect-wallet";
import { HealthBadge } from "@/components/health-badge";
import { RiskDisclosure } from "@/components/risk-disclosure";

type SettingsResponse = {
  ok: boolean;
  globalPaused: boolean;
  settings: {
    enabled: boolean;
    strategyPaused: boolean;
    strategyMode: "ARBITRAGE" | "LIQUIDATION" | "HYBRID";
    minNetProfitUsd: string;
    maxSlippageBps: number;
    gasCeilingGwei: string;
    maxPositionUsd: string;
    liquidationHealthFactor: string;
    liquidationDebtToken: string | null;
    liquidationCollateralToken: string | null;
    liquidationRepayAmount: string | null;
    liquidationWithdrawAmount: string | null;
    liquidationRateMode: number;
    allowedPairs: string[];
    cooldownSeconds: number;
    dailyLossCapUsd: string;
    perTokenExposureUsd: Record<string, number>;
    quoteStaleAfterMs: number;
    liquidityDepthBps: number;
    consecutiveFailureLimit: number;
    consecutiveFailures: number;
    dsaId: number;
    dsaAddress: string;
    authorityEnabled: boolean;
    executorAuthority: string | null;
  } | null;
};

type OpportunityRow = {
  id: string;
  route: string;
  grossProfitUsd: string;
  netProfitUsd: string;
  gasCostUsd: string;
  confidence: string;
  ageMs: number;
  executable: boolean;
  createdAt: string;
};

type ExecutionRow = {
  id: string;
  txHash: string | null;
  status: string;
  routeDescription: string;
  estimatedNetUsd: string;
  realizedPnlUsd: string | null;
  arbiscanUrl: string | null;
  createdAt: string;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export function DashboardClient() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const supportedTokens = useMemo(
    () => [
      { symbol: "USDC", address: "0xaf88d065e77c8cc2239327c5edb3a432268e583" },
      { symbol: "USDT", address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" },
      { symbol: "DAI", address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1" },
      { symbol: "WETH", address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1" },
    ],
    []
  );
  const [wallet, setWallet] = useState<string>("");
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [dsaAddressInput, setDsaAddressInput] = useState("");
  const [dsaIdInput, setDsaIdInput] = useState("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setWallet(address.toLowerCase());
    setAuthed(false);
  }, [address]);

  async function refreshAll(currentWallet: string) {
    if (!currentWallet || !authed) return;
    const [settingsData, opportunitiesData, executionsData] = await Promise.all([
      readJson<SettingsResponse>("/api/settings"),
      readJson<{ ok: boolean; items: OpportunityRow[] }>("/api/opportunities"),
      readJson<{ ok: boolean; items: ExecutionRow[] }>("/api/executions"),
    ]);
    setSettings(settingsData);
    setOpportunities(opportunitiesData.items);
    setExecutions(executionsData.items);
  }

  useEffect(() => {
    if (!wallet || !authed) return;
    refreshAll(wallet).catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load"));
    const timer = setInterval(() => {
      refreshAll(wallet).catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [wallet, authed]);

  async function authenticate() {
    if (!wallet) return;
    setLoading(true);
    setMessage("");
    try {
      const challengeRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const challengeJson = await challengeRes.json();
      if (!challengeRes.ok || !challengeJson.ok) throw new Error(challengeJson.error ?? "Challenge failed");
      const challengeMessage = challengeJson.message as string;
      const nextNonce = challengeJson.nonce as string;
      const signature = await signMessageAsync({ message: challengeMessage });
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, message: challengeMessage, signature, nonce: nextNonce }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok) throw new Error(verifyJson.error ?? "Verification failed");
      setAuthed(true);
      setNonce(nextNonce);
      setMessage("Authenticated");
      await refreshAll(wallet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setNonce(null);
    setSettings(null);
    setOpportunities([]);
    setExecutions([]);
  }

  async function submit(path: string, body: unknown) {
    if (!authed) {
      setMessage("Authenticate first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", ...(nonce ? { "x-auth-nonce": nonce } : {}) },
        body: JSON.stringify({ ...(body as Record<string, unknown>), nonce }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Operation failed");
      setMessage("Success");
      await refreshAll(wallet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  }

  const defaultAllowedPairs = useMemo(
    () => settings?.settings?.allowedPairs?.join(",") ?? "0xaf88d065e77c8cc2239327c5edb3a432268e583:0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    [settings]
  );

  const [form, setForm] = useState({
    strategyMode: "ARBITRAGE" as "ARBITRAGE" | "LIQUIDATION" | "HYBRID",
    minNetProfitUsd: "10",
    maxSlippageBps: "40",
    gasCeilingGwei: "0.2",
    maxPositionUsd: "500",
    liquidationHealthFactor: "1.05",
    liquidationDebtToken: "0xaf88d065e77c8cc2239327c5edb3a432268e583",
    liquidationCollateralToken: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    liquidationRepayAmount: "500",
    liquidationWithdrawAmount: "0.25",
    liquidationRateMode: "2",
    allowedPairs: defaultAllowedPairs,
    cooldownSeconds: "60",
    dailyLossCapUsd: "100",
    quoteStaleAfterMs: "15000",
    liquidityDepthBps: "700",
    consecutiveFailureLimit: "3",
    enabled: false,
    strategyPaused: false,
  });

  useEffect(() => {
    if (!settings?.settings) return;
    setForm({
      strategyMode: settings.settings.strategyMode,
      minNetProfitUsd: settings.settings.minNetProfitUsd,
      maxSlippageBps: String(settings.settings.maxSlippageBps),
      gasCeilingGwei: settings.settings.gasCeilingGwei,
      maxPositionUsd: settings.settings.maxPositionUsd,
      liquidationHealthFactor: settings.settings.liquidationHealthFactor,
      liquidationDebtToken: settings.settings.liquidationDebtToken ?? "",
      liquidationCollateralToken: settings.settings.liquidationCollateralToken ?? "",
      liquidationRepayAmount: settings.settings.liquidationRepayAmount ?? "",
      liquidationWithdrawAmount: settings.settings.liquidationWithdrawAmount ?? "",
      liquidationRateMode: String(settings.settings.liquidationRateMode ?? 2),
      allowedPairs: settings.settings.allowedPairs.join(","),
      cooldownSeconds: String(settings.settings.cooldownSeconds),
      dailyLossCapUsd: settings.settings.dailyLossCapUsd,
      quoteStaleAfterMs: String(settings.settings.quoteStaleAfterMs),
      liquidityDepthBps: String(settings.settings.liquidityDepthBps),
      consecutiveFailureLimit: String(settings.settings.consecutiveFailureLimit),
      enabled: settings.settings.enabled,
      strategyPaused: settings.settings.strategyPaused,
    });
  }, [settings]);

  if (!address) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-semibold">Connect wallet</h2>
          <p className="mb-4 text-slate-400">Arbitrum mainnet only. Connect to manage DSA and one-time authority.</p>
          <ConnectWallet />
        </div>
        <RiskDisclosure />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Connected wallet</p>
          <p className="font-mono text-sm">{wallet}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Worker heartbeat</p>
          <HealthBadge />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Session</p>
          <div className="flex items-center gap-2">
            <p className={`font-semibold ${authed ? "text-emerald-400" : "text-amber-300"}`}>
              {authed ? "AUTHENTICATED" : "NOT AUTHENTICATED"}
            </p>
            {!authed ? (
              <button
                className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-medium hover:bg-indigo-400"
                onClick={authenticate}
                disabled={loading}
              >
                Sign In
              </button>
            ) : (
              <button
                className="rounded-md bg-slate-700 px-3 py-1 text-xs font-medium hover:bg-slate-600"
                onClick={logout}
                disabled={loading}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-400">Global pause</p>
        <p className="font-semibold">{settings?.globalPaused ? "ACTIVE" : "OFF"}</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-semibold">Create / Import DSA</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            onClick={() => submit("/api/dsa/create", {})}
            disabled={loading}
          >
            Create DSA
          </button>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="DSA ID"
            value={dsaIdInput}
            onChange={(e) => setDsaIdInput(e.target.value)}
          />
          <input
            className="min-w-[320px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="DSA Address"
            value={dsaAddressInput}
            onChange={(e) => setDsaAddressInput(e.target.value)}
          />
          <button
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
            onClick={() => submit("/api/dsa/accounts", { dsaId: Number(dsaIdInput), dsaAddress: dsaAddressInput })}
            disabled={loading}
          >
            Import
          </button>
        </div>
        {settings?.settings && (
          <p className="mt-3 text-sm text-slate-300">
            Active DSA: #{settings.settings.dsaId} ({settings.settings.dsaAddress})
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-semibold">One-time autonomous authorization</h3>
        <p className="mb-2 text-sm text-slate-400">
          This flow adds/removes the executor authority on your DSA. You sign once on this step; autonomous trades then execute server-side.
        </p>
        <p className="mb-3 text-sm">
          Status:{" "}
          <span className={settings?.settings?.authorityEnabled ? "text-emerald-400" : "text-amber-300"}>
            {settings?.settings?.authorityEnabled ? "ENABLED" : "DISABLED"}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            onClick={() => submit("/api/dsa/authority", { action: "enable" })}
            disabled={loading}
          >
            Enable Autonomous Trading
          </button>
          <button
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-500"
            onClick={() => submit("/api/dsa/authority", { action: "revoke" })}
            disabled={loading}
          >
            Revoke Authority
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-semibold">Autonomous Settings</h3>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-400">Strategy mode</span>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={form.strategyMode}
            onChange={(e) => setForm((prev) => ({ ...prev, strategyMode: e.target.value as typeof form.strategyMode }))}
          >
            <option value="ARBITRAGE">Arbitrage only</option>
            <option value="LIQUIDATION">Liquidation / deleverage only</option>
            <option value="HYBRID">Hybrid (both)</option>
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Min net profit (USD)", "minNetProfitUsd"],
            ["Max slippage (bps)", "maxSlippageBps"],
            ["Gas ceiling (gwei)", "gasCeilingGwei"],
            ["Max position (USD)", "maxPositionUsd"],
            ["Cooldown (seconds)", "cooldownSeconds"],
            ["Daily loss cap (USD)", "dailyLossCapUsd"],
            ["Quote stale after (ms)", "quoteStaleAfterMs"],
            ["Liquidity depth bps", "liquidityDepthBps"],
            ["Consecutive failure limit", "consecutiveFailureLimit"],
          ].map(([label, key]) => (
            <label key={key} className="text-sm">
              <span className="mb-1 block text-slate-400">{label}</span>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-400">Allowed token pairs (comma-separated tokenIn:tokenOut)</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs"
            value={form.allowedPairs}
            onChange={(e) => setForm((prev) => ({ ...prev, allowedPairs: e.target.value }))}
            placeholder={defaultAllowedPairs}
          />
        </label>
        <div className="mt-3 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            Bot enabled
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.strategyPaused}
              onChange={(e) => setForm((prev) => ({ ...prev, strategyPaused: e.target.checked }))}
            />
            Strategy paused
          </label>
        </div>
        <div className="mt-4 rounded-lg border border-slate-700/80 bg-slate-950/40 p-3">
          <h4 className="mb-2 text-sm font-semibold text-slate-200">Liquidation / Deleverage Trigger</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Trigger health factor (Aave V3)</span>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationHealthFactor}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationHealthFactor: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Debt token</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationDebtToken}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationDebtToken: e.target.value }))}
              >
                <option value="">Select debt token</option>
                {supportedTokens.map((token) => (
                  <option key={`debt-${token.address}`} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Collateral token</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationCollateralToken}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationCollateralToken: e.target.value }))}
              >
                <option value="">Select collateral token</option>
                {supportedTokens.map((token) => (
                  <option key={`collat-${token.address}`} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Repay amount (token units)</span>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationRepayAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationRepayAmount: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Withdraw amount (token units)</span>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationWithdrawAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationWithdrawAmount: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-400">Aave rate mode (1 stable, 2 variable)</span>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.liquidationRateMode}
                onChange={(e) => setForm((prev) => ({ ...prev, liquidationRateMode: e.target.value }))}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-400"
            disabled={loading}
            onClick={() =>
              submit("/api/settings", {
                ...form,
                allowedPairs: form.allowedPairs
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                liquidationDebtToken: form.liquidationDebtToken || null,
                liquidationCollateralToken: form.liquidationCollateralToken || null,
                liquidationRepayAmount: form.liquidationRepayAmount
                  ? Number(form.liquidationRepayAmount)
                  : null,
                liquidationWithdrawAmount: form.liquidationWithdrawAmount
                  ? Number(form.liquidationWithdrawAmount)
                  : null,
                liquidationRateMode: Number(form.liquidationRateMode || 2),
                liquidationHealthFactor: Number(form.liquidationHealthFactor || 1.05),
              })
            }
          >
            Save settings
          </button>
          <button
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-600"
            disabled={loading}
            onClick={() => submit("/api/pause", { globalPaused: true, reason: "Manual emergency stop from dashboard" })}
          >
            Emergency Pause (Global)
          </button>
          <button
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"
            disabled={loading}
            onClick={() => submit("/api/pause", { globalPaused: false, reason: null })}
          >
            Resume Global
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-semibold">Live opportunities</h3>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-1">Route</th>
                <th className="px-2 py-1">Gross $</th>
                <th className="px-2 py-1">Net $</th>
                <th className="px-2 py-1">Gas $</th>
                <th className="px-2 py-1">Confidence</th>
                <th className="px-2 py-1">Age</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-1">{row.route}</td>
                  <td className="px-2 py-1">{row.grossProfitUsd}</td>
                  <td className={`px-2 py-1 ${Number(row.netProfitUsd) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {row.netProfitUsd}
                  </td>
                  <td className="px-2 py-1">{row.gasCostUsd}</td>
                  <td className="px-2 py-1">{row.confidence}</td>
                  <td className="px-2 py-1">{Math.round(row.ageMs / 1000)}s</td>
                </tr>
              ))}
              {!opportunities.length && (
                <tr>
                  <td className="px-2 py-2 text-slate-500" colSpan={6}>
                    No opportunities in recent scan window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-semibold">Execution history</h3>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-1">Tx hash</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Route</th>
                <th className="px-2 py-1">Est. Net $</th>
                <th className="px-2 py-1">Realized $</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-1 font-mono text-xs">
                    {row.txHash ? (
                      <a href={row.arbiscanUrl ?? "#"} target="_blank" rel="noreferrer" className="text-indigo-300 underline">
                        {row.txHash.slice(0, 10)}...
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 py-1">{row.status}</td>
                  <td className="px-2 py-1">{row.routeDescription}</td>
                  <td className="px-2 py-1">{row.estimatedNetUsd}</td>
                  <td className="px-2 py-1">{row.realizedPnlUsd ?? "-"}</td>
                </tr>
              ))}
              {!executions.length && (
                <tr>
                  <td className="px-2 py-2 text-slate-500" colSpan={5}>
                    No executions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RiskDisclosure />
      {message ? <p className="text-sm text-amber-300">{message}</p> : null}
    </div>
  );
}
