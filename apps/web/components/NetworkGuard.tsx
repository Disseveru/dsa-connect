'use client'

import { useChainId, useSwitchChain } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { ReactNode } from 'react'

interface NetworkGuardProps {
  children: ReactNode
}

/**
 * Enforces that the connected wallet is on Arbitrum One (chainId 42161).
 * Renders a full-page prompt to switch networks if not.
 */
export function NetworkGuard({ children }: NetworkGuardProps) {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (chainId !== arbitrum.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="max-w-md w-full bg-gray-900 border border-yellow-500 rounded-2xl p-8 text-center shadow-xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-3">Wrong Network</h2>
          <p className="text-gray-300 mb-6">
            This app only works on{' '}
            <span className="font-semibold text-[#28a0f0]">Arbitrum One</span> (chainId 42161). Please
            switch your wallet to continue.
          </p>
          <button
            onClick={() => switchChain({ chainId: arbitrum.id })}
            disabled={isPending}
            className="w-full py-3 px-6 rounded-xl bg-[#28a0f0] hover:bg-blue-500 text-white font-bold text-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Switching…' : 'Switch to Arbitrum One'}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
