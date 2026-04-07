import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Arbitrum Autonomous DSA Arbitrage",
  description: "Mainnet-only autonomous flash-loan arbitrage dashboard powered by Instadapp DSA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
