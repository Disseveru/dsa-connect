'use client'

import { useState } from 'react'
import { DEFAULT_DSA_ADDRESS } from '@/lib/config/arbitrum'
import { isAddress } from 'viem'

interface DsaConfigProps {
  dsaAddress: string
  onChange: (address: string) => void
}

/**
 * Panel for configuring the DSA (Instadapp Smart Account) address.
 * Defaults to the owner's known DSA on Arbitrum One.
 */
export function DsaConfig({ dsaAddress, onChange }: DsaConfigProps) {
  const [inputValue, setInputValue] = useState(dsaAddress)
  const [editing, setEditing] = useState(false)

  const isValid = isAddress(inputValue)

  const handleSave = () => {
    if (isValid) {
      onChange(inputValue)
      setEditing(false)
    }
  }

  const handleReset = () => {
    setInputValue(DEFAULT_DSA_ADDRESS)
    onChange(DEFAULT_DSA_ADDRESS)
    setEditing(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🏦</span>
        <h3 className="text-lg font-bold text-white">DSA Account Address</h3>
        <a
          href={`https://arbiscan.io/address/${dsaAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-[#28a0f0] hover:underline"
        >
          View on Arbiscan ↗
        </a>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        Your Instadapp Smart Account (DSA v2) address on Arbitrum One. All flashloan spell
        transactions will be cast through this account.
      </p>

      {editing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#28a0f0] transition-colors"
          />
          {!isValid && inputValue.length > 0 && (
            <p className="text-red-400 text-xs">Invalid Ethereum address</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 py-2 px-4 rounded-xl bg-[#28a0f0] hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setInputValue(dsaAddress)
                setEditing(false)
              }}
              className="flex-1 py-2 px-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="py-2 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-semibold text-sm transition-colors"
              title="Reset to default"
            >
              Reset
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-[#28a0f0] break-all">
            {dsaAddress}
          </code>
          <button
            onClick={() => setEditing(true)}
            className="py-2 px-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors whitespace-nowrap"
          >
            Change
          </button>
        </div>
      )}
    </div>
  )
}
