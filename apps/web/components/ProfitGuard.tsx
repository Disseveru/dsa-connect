'use client'

/**
 * "Profit must cover gas" guardrail UI.
 *
 * In v0.1 this is a UI checkbox + placeholder display.
 * The actual quoting / simulation logic is stubbed with TODOs.
 *
 * TODO (v0.2): Integrate a gas price oracle and DEX quote to compute:
 *   estimatedProfitUSD  = quote(buyDex) - quote(sellDex) - flashloanFee
 *   estimatedGasCostUSD = gasLimit * gasPrice * ETH/USD_price
 *   and block the trade if estimatedProfitUSD <= estimatedGasCostUSD.
 */

interface ProfitGuardProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export function ProfitGuard({ enabled, onToggle }: ProfitGuardProps) {
  // TODO (v0.2): fetch live gas price and DEX quote, compute real values
  const estimatedProfitUSD: number | null = null as number | null // placeholder
  const estimatedGasCostUSD: number | null = null as number | null // placeholder
  const willBlock =
    enabled &&
    estimatedProfitUSD !== null &&
    estimatedGasCostUSD !== null &&
    estimatedProfitUSD <= estimatedGasCostUSD

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <input
          id="profit-guard"
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 w-5 h-5 accent-green-500 cursor-pointer flex-shrink-0"
        />
        <div className="flex-1">
          <label
            htmlFor="profit-guard"
            className="flex items-center gap-2 cursor-pointer font-bold text-white"
          >
            <span className="text-green-400">🛡️</span> Profit Must Cover Gas
          </label>
          <p className="text-gray-400 text-sm mt-1">
            When enabled, the app will refuse to submit the transaction if the estimated profit does
            not exceed the estimated gas cost. <strong className="text-yellow-400">Strongly recommended.</strong>
          </p>

          {/* Placeholder estimates — will be filled by quote engine in v0.2 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Est. Profit</p>
              <p className="text-lg font-bold text-green-400">
                {estimatedProfitUSD !== null ? `$${estimatedProfitUSD.toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {/* TODO (v0.2): show quote source */}
                Quote pending
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Est. Gas Cost</p>
              <p className="text-lg font-bold text-orange-400">
                {estimatedGasCostUSD !== null ? `$${estimatedGasCostUSD.toFixed(2)}` : '—'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {/* TODO (v0.2): integrate gas price oracle */}
                Gas oracle pending
              </p>
            </div>
          </div>

          {willBlock && (
            <div className="mt-3 bg-red-900/40 border border-red-600 rounded-xl px-4 py-2 text-red-300 text-sm font-medium">
              ❌ Trade blocked — estimated profit does not cover gas cost.
            </div>
          )}

          {!willBlock && enabled && (
            <div className="mt-3 bg-gray-800 rounded-xl px-4 py-2 text-gray-400 text-xs">
              ℹ️ Live quoting will be enabled in v0.2. Currently showing placeholders only.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
