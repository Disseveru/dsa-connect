import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'DSA Flashloan Arb — Arbitrum One',
  description:
    'Execute flashloan arbitrage on Arbitrum One using Instadapp DSA v2 — no coding required.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
