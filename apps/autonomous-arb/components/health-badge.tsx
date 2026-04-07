"use client";

import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  mainnet: boolean;
  worker: {
    alive: boolean;
    lastSeenAt: string | null;
    status: string;
  };
};

export function HealthBadge() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await fetch("/api/health", { cache: "no-store" });
      const json = (await response.json()) as Health;
      if (mounted) setHealth(json);
    };
    load();
    const id = setInterval(load, 12_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (!health) return <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">Loading...</span>;

  const classes = health.ok
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${classes}`}>
      {health.mainnet ? "Arbitrum Mainnet" : "Wrong Chain"} · Worker {health.worker.alive ? "online" : "offline"}
    </span>
  );
}

