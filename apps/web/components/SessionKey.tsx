'use client'

import { useSessionKey } from '@/lib/hooks/useSessionKey'

/**
 * Session Key panel (Option 1 architecture stub).
 *
 * In v0.1 this generates an ephemeral key in memory and shows the address.
 * The key is NEVER persisted or granted any on-chain permissions.
 *
 * TODO (v0.2):
 *  1. Prompt user to sign a DSA `addAuth(sessionKeyAddress)` transaction (with expiry
 *     + connector allow-list via DSA Authority module or DSA spell).
 *  2. Use the in-memory private key to sign and broadcast spell txs directly — no
 *     MetaMask popup per trade, dramatically reducing opportunity latency.
 *  3. Implement automatic session key expiry (max 24 h).
 */
export function SessionKey() {
  const { state, createSession, clearSession } = useSessionKey()

  return (
    <div className="bg-gray-900 border border-purple-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔑</span>
        <h3 className="text-lg font-bold text-white">Session Key</h3>
        <span className="ml-auto text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full font-medium">
          v0.1 stub
        </span>
      </div>

      <div className="text-gray-400 text-sm space-y-3 mb-5">
        <p>
          <strong className="text-white">What is a session key?</strong> A session key is a
          temporary, limited wallet that can submit transactions on behalf of your DSA account —
          without requiring you to manually approve every trade in MetaMask.
        </p>
        <p>
          This is critical for catching arbitrage opportunities that close in milliseconds. Instead
          of waiting for a MetaMask pop-up, your session key can submit a spell the moment a
          profitable opportunity is detected.
        </p>
        <p className="text-yellow-400">
          <strong>v0.1 limitation:</strong> Clicking &quot;Create Session&quot; generates an
          ephemeral key only in your browser memory. It is shown for preview purposes and has{' '}
          <em>no on-chain permissions</em>. It cannot sign or submit any transactions yet.
        </p>
        <p>
          <strong className="text-white">Security model:</strong> The private key is never stored
          (not in localStorage, cookies, or any server). Refreshing the page clears it. In v0.2 this
          will be scoped to specific connectors with a time-lock expiry.
        </p>
      </div>

      {state.status === 'idle' ? (
        <button
          onClick={createSession}
          className="w-full py-3 px-6 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold transition-colors"
        >
          Create Session Key (Preview)
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Session Key Address (no on-chain permissions)</p>
            <code className="text-sm font-mono text-purple-300 break-all">{state.address}</code>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-green-900/30 border border-green-700 rounded-xl px-3 py-2 text-green-400 text-xs font-medium text-center">
              ✓ Key generated in memory
            </div>
            <button
              onClick={clearSession}
              className="py-2 px-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
          <p className="text-xs text-gray-600">
            TODO (v0.2): Grant this address limited DSA auth → submit spell txs without MetaMask
            confirmation.
          </p>
        </div>
      )}
    </div>
  )
}
