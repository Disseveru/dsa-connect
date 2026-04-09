'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { NetworkGuard } from '@/components/NetworkGuard'
import { RiskDisclosure } from '@/components/RiskDisclosure'
import { DsaConfig } from '@/components/DsaConfig'
import { FlashloanArbForm } from '@/components/FlashloanArbForm'
import { SessionKey } from '@/components/SessionKey'
import { DEFAULT_DSA_ADDRESS } from '@/lib/config/arbitrum'

export default function Home() {
  const { isConnected } = useAccount()
  const [riskAcknowledged, setRiskAcknowledged] = useState(false)
  const [dsaAddress, setDsaAddress] = useState(DEFAULT_DSA_ADDRESS)

  // Show risk disclosure before anything else
  if (!riskAcknowledged) {
    return <RiskDisclosure onAcknowledge={() => setRiskAcknowledged(true)} />
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-extrabold text-white leading-tight">
                DSA Flashloan Arb
              </h1>
              <p className="text-xs text-[#28a0f0] font-medium">Arbitrum One · v0.1</p>
            </div>
          </div>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Intro banner */}
        <div className="bg-gradient-to-r from-[#1b2338] to-gray-900 border border-[#28a0f0]/30 rounded-2xl p-6">
          <h2 className="text-2xl font-extrabold text-white mb-2">
            Flashloan Arbitrage on Arbitrum One
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed max-w-2xl">
            Borrow tokens for free (via Instapool V5), buy on one DEX at a lower price, sell on
            another DEX at a higher price, repay the flashloan, and keep the profit — all in a
            single atomic transaction. No coding required.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs bg-[#28a0f0]/20 text-[#28a0f0] border border-[#28a0f0]/30 px-3 py-1 rounded-full font-medium">
              Arbitrum One Only
            </span>
            <span className="text-xs bg-purple-900/30 text-purple-300 border border-purple-700/30 px-3 py-1 rounded-full font-medium">
              DSA v2 Required
            </span>
            <span className="text-xs bg-green-900/30 text-green-300 border border-green-700/30 px-3 py-1 rounded-full font-medium">
              Non-custodial
            </span>
          </div>
        </div>

        {!isConnected ? (
          /* Not connected — prompt to connect */
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🔌</div>
            <h3 className="text-xl font-bold text-white mb-3">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Connect a wallet that is an authority on your Instadapp DSA account on Arbitrum One.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          /* Connected — show the app */
          <NetworkGuard>
            <div className="space-y-6">
              {/* DSA address config */}
              <DsaConfig dsaAddress={dsaAddress} onChange={setDsaAddress} />

              {/* Main arb form */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>⚡</span> Configure Flashloan Arbitrage
                </h2>
                <FlashloanArbForm dsaAddress={dsaAddress} />
              </div>

              {/* Session key stub */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🔑</span> Session Key (Preview)
                </h2>
                <SessionKey />
              </div>

              {/* Footer note */}
              <div className="text-center text-xs text-gray-600 pb-4">
                DSA Flashloan Arb v0.1 · Arbitrum One · Built on{' '}
                <a
                  href="https://instadapp.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#28a0f0] hover:underline"
                >
                  Instadapp DSA v2
                </a>{' '}
                ·{' '}
                <button
                  onClick={() => setRiskAcknowledged(false)}
                  className="text-gray-500 hover:text-gray-400 hover:underline"
                >
                  Re-read risk disclosure
                </button>
              </div>
            </div>
          </NetworkGuard>
        )}
      </div>
    </main>
  )
}
