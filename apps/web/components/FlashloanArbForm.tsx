'use client'

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import {
  ARBITRUM_TOKENS,
  SUPPORTED_DEXES,
  SUPPORTED_FLASHLOAN_CONNECTORS,
} from '@/lib/config/arbitrum'
import { ProfitGuard } from './ProfitGuard'

interface FlashloanArbFormProps {
  dsaAddress: string
}

type TxStatus =
  | { type: 'idle' }
  | { type: 'simulating' }
  | { type: 'pending'; hash: string }
  | { type: 'success'; hash: string }
  | { type: 'error'; message: string }

/**
 * Main flashloan arbitrage configuration form.
 *
 * In v0.1 the "Execute" button builds the spell structure and logs it — actual
 * DSA cast integration is stubbed with TODO comments.
 *
 * TODO (v0.2):
 *  - Integrate dsa-connect SDK to build and cast the spell via the DSA.
 *  - Add live DEX quote to compute real profit vs gas.
 *  - Add slippage / deadline inputs.
 *  - Validate that the selected connectors are enabled on InstaConnectorsV2.
 */
export function FlashloanArbForm({ dsaAddress }: FlashloanArbFormProps) {
  const { address: walletAddress } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Form state
  const [borrowToken, setBorrowToken] = useState<string>(ARBITRUM_TOKENS[0].symbol)
  const [borrowAmount, setBorrowAmount] = useState('')
  const [buyDex, setBuyDex] = useState<string>(SUPPORTED_DEXES[0].id)
  const [sellDex, setSellDex] = useState<string>(SUPPORTED_DEXES[1].id)
  const [flashloanConnector] = useState<string>(SUPPORTED_FLASHLOAN_CONNECTORS[0].id)
  const [profitGuardEnabled, setProfitGuardEnabled] = useState(true)
  const [txStatus, setTxStatus] = useState<TxStatus>({ type: 'idle' })

  const selectedToken = ARBITRUM_TOKENS.find((t) => t.symbol === borrowToken) ?? ARBITRUM_TOKENS[0]
  const buyDexInfo = SUPPORTED_DEXES.find((d) => d.id === buyDex) ?? SUPPORTED_DEXES[0]
  const sellDexInfo = SUPPORTED_DEXES.find((d) => d.id === sellDex) ?? SUPPORTED_DEXES[1]

  const isFormValid =
    borrowAmount.trim() !== '' &&
    parseFloat(borrowAmount) > 0 &&
    buyDex !== sellDex

  const handleExecute = async () => {
    if (!walletAddress || !publicClient || !walletClient) {
      setTxStatus({ type: 'error', message: 'Wallet not connected' })
      return
    }

    if (!isFormValid) return

    // TODO (v0.2): check profit guard — compare estimatedProfitUSD > estimatedGasCostUSD
    // For now, log the spell structure and show a placeholder success

    setTxStatus({ type: 'simulating' })

    // Build the spell structure (for illustration only — not sent in v0.1)
    const spellData = {
      dsaAddress,
      flashloanConnector: SUPPORTED_FLASHLOAN_CONNECTORS[0].connector,
      borrowToken: selectedToken,
      borrowAmount,
      route: [
        { step: 'buy', dex: buyDexInfo.label, connector: buyDexInfo.connector },
        { step: 'sell', dex: sellDexInfo.label, connector: sellDexInfo.connector },
      ],
      profitGuardEnabled,
    }

    console.log('[DSA Flashloan Arb v0.1] Spell preview:', spellData)

    // TODO (v0.2): cast the spell using dsa-connect SDK:
    //   const dsa = new DSA(web3, chainId)
    //   dsa.setInstance(dsaAddress)
    //   const spells = dsa.Spell()
    //   spells.add({ connector: flashloanConnector.name, method: 'flashBorrowAndCast', args: [...] })
    //   const txHash = await spells.cast({ from: walletAddress })

    await new Promise((r) => setTimeout(r, 1200)) // simulate delay

    setTxStatus({
      type: 'error',
      message:
        'v0.1: Spell simulation complete (see browser console). On-chain execution not yet implemented — coming in v0.2.',
    })
  }

  return (
    <div className="space-y-6">
      {/* Flashloan Connector */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚡</span>
          <h3 className="text-lg font-bold text-white">Flashloan Connector</h3>
        </div>
        <div className="flex flex-col gap-2">
          {SUPPORTED_FLASHLOAN_CONNECTORS.map((fc) => (
            <div
              key={fc.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                flashloanConnector === fc.id
                  ? 'border-[#28a0f0] bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="w-4 h-4 rounded-full border-2 border-[#28a0f0] flex items-center justify-center flex-shrink-0">
                {flashloanConnector === fc.id && (
                  <div className="w-2 h-2 rounded-full bg-[#28a0f0]" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{fc.label}</p>
                <p className="text-xs text-gray-500 font-mono">{fc.connector.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Borrow Token + Amount */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">💰</span>
          <h3 className="text-lg font-bold text-white">Flashloan Amount</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token to Borrow</label>
            <select
              value={borrowToken}
              onChange={(e) => setBorrowToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#28a0f0] transition-colors"
            >
              {ARBITRUM_TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder={`e.g. 1000`}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#28a0f0] transition-colors"
            />
          </div>
        </div>
        {selectedToken && (
          <p className="text-xs text-gray-500 mt-2 font-mono">
            Token address: {selectedToken.address}
          </p>
        )}
      </div>

      {/* DEX Route */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔄</span>
          <h3 className="text-lg font-bold text-white">DEX Arbitrage Route</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Buy on the first DEX (lower price), sell on the second DEX (higher price). The flashloan
          funds the purchase; profit is repaid after the sell.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Buy On (Step 1)</label>
            <select
              value={buyDex}
              onChange={(e) => setBuyDex(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#28a0f0] transition-colors"
            >
              {SUPPORTED_DEXES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Sell On (Step 2)</label>
            <select
              value={sellDex}
              onChange={(e) => setSellDex(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#28a0f0] transition-colors"
            >
              {SUPPORTED_DEXES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {buyDex === sellDex && (
          <p className="text-red-400 text-sm mt-2">
            ⚠️ Buy and sell DEX must be different for arbitrage.
          </p>
        )}

        {/* Route preview */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <span className="bg-gray-800 px-3 py-1 rounded-lg font-medium">
            {buyDexInfo.label}
          </span>
          <span>→ arb →</span>
          <span className="bg-gray-800 px-3 py-1 rounded-lg font-medium">
            {sellDexInfo.label}
          </span>
        </div>
      </div>

      {/* Profit Guard */}
      <ProfitGuard enabled={profitGuardEnabled} onToggle={setProfitGuardEnabled} />

      {/* Execute button */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
        <button
          onClick={handleExecute}
          disabled={!isFormValid || txStatus.type === 'simulating' || txStatus.type === 'pending'}
          className="w-full py-4 px-6 rounded-xl bg-[#28a0f0] hover:bg-blue-500 text-white font-extrabold text-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
        >
          {txStatus.type === 'simulating'
            ? '⚡ Simulating Spell…'
            : txStatus.type === 'pending'
            ? '⏳ Submitting…'
            : '⚡ Execute Flashloan Arb'}
        </button>

        {!walletAddress && (
          <p className="text-center text-yellow-400 text-sm mt-3">
            Connect your wallet to execute trades.
          </p>
        )}

        {txStatus.type === 'success' && (
          <div className="mt-4 bg-green-900/30 border border-green-600 rounded-xl px-4 py-3 text-green-300 text-sm">
            ✅ Transaction submitted!{' '}
            <a
              href={`https://arbiscan.io/tx/${txStatus.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Arbiscan ↗
            </a>
          </div>
        )}

        {txStatus.type === 'error' && (
          <div className="mt-4 bg-yellow-900/30 border border-yellow-600 rounded-xl px-4 py-3 text-yellow-300 text-sm">
            ℹ️ {txStatus.message}
          </div>
        )}
      </div>
    </div>
  )
}
