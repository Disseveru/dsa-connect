"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useMemo, type PropsWithChildren } from "react";
import { appChain } from "@/lib/chain";
import { getPublicEnv } from "@/lib/env";

export function AppProviders({ children }: PropsWithChildren) {
  const config = useMemo(() => {
    const env = getPublicEnv();
    return getDefaultConfig({
      appName: env.NEXT_PUBLIC_APP_NAME,
      projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      chains: [appChain],
      ssr: true,
    });
  }, []);
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={appChain}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
