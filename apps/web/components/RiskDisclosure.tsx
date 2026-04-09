'use client'

import { useState } from 'react'

/**
 * Prominent risk disclosure that must be acknowledged before using the app.
 */
export function RiskDisclosure({ onAcknowledge }: { onAcknowledge: () => void }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="max-w-2xl w-full bg-gray-900 border border-red-600 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🚨</span>
          <h2 className="text-2xl font-extrabold text-red-400">Risk Disclosure — Please Read</h2>
        </div>

        <div className="space-y-4 text-gray-300 text-sm leading-relaxed mb-8">
          <p>
            <strong className="text-white">Flashloan arbitrage is a high-risk DeFi operation.</strong>{' '}
            Transactions are complex, irreversible, and can fail (resulting in loss of gas fees with
            no profit).
          </p>
          <p>
            <strong className="text-white">This is experimental software (v0.1).</strong> It has not
            been audited. Use at your own risk with funds you are fully prepared to lose.
          </p>
          <p>
            <strong className="text-white">
              Price opportunities can disappear in milliseconds.
            </strong>{' '}
            By the time a transaction is submitted and mined, the arbitrage window may be gone,
            resulting in a reverted transaction (gas lost) or a smaller/negative profit.
          </p>
          <p>
            <strong className="text-white">You are solely responsible</strong> for any losses
            incurred. This tool does not guarantee profit. Past on-chain arbitrage opportunities do
            not predict future ones.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-400">
            <li>Smart contract bugs could result in loss of funds.</li>
            <li>MEV bots may front-run your transaction.</li>
            <li>Slippage settings affect execution outcome.</li>
            <li>Always verify DSA contract addresses independently.</li>
          </ul>
          <p className="text-yellow-400 font-medium">
            Only interact with a DSA account you own and have verified on Arbiscan.
          </p>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <input
            id="risk-ack"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-5 h-5 accent-red-500 cursor-pointer flex-shrink-0"
          />
          <label htmlFor="risk-ack" className="text-gray-200 cursor-pointer text-sm leading-snug">
            I have read and understood the risks above. I accept full responsibility for my actions
            and any resulting losses. I am not using this app in any jurisdiction where it is
            prohibited.
          </label>
        </div>

        <button
          onClick={onAcknowledge}
          disabled={!checked}
          className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  )
}
