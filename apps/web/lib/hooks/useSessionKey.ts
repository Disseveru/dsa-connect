import { useState, useCallback } from 'react'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

export type SessionKeyState =
  | { status: 'idle' }
  | { status: 'active'; address: string }

/**
 * Hook: generates an ephemeral in-memory "session key" for v0.1.
 *
 * IMPORTANT:
 * - The private key is stored only in React state (never localStorage / cookie / server).
 * - In v0.1 this key has NO on-chain permissions. It is displayed to the user as
 *   a preview of the "Option 1 session key" architecture.
 * - TODO (v0.2): call DSA `addAuth` (with time-lock + connector allow-list) to grant
 *   this key scoped permission, then use it to sign and broadcast spell txs without
 *   requiring wallet confirmation on every trade.
 */
export function useSessionKey() {
  const [state, setState] = useState<SessionKeyState>({ status: 'idle' })

  const createSession = useCallback(() => {
    // Generate a fresh ephemeral key — never persisted.
    // In v0.1 the key is immediately discarded (only the address is kept for display).
    // TODO (v0.2): retain the key in a ref (not state) and use it to sign DSA spell txs
    //   after granting the address scoped DSA auth via `addAuth` with expiry + allow-list.
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)
    setState({ status: 'active', address: account.address })
    // privateKey is intentionally not stored — refresh clears the address too.
  }, [])

  const clearSession = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  return { state, createSession, clearSession }
}
