# Autonomous Arbitrum Mainnet Flash-Loan Arbitrage + Liquidation (Instadapp DSA)

Production-focused, **Arbitrum mainnet only** autonomous arbitrage + liquidation stack:

- Next.js App Router dashboard (wallet onboarding, DSA management, one-time authority enable/revoke)
- Node worker service for scanning + risk-gating + execution
- Real Instadapp DSA authority and flash-loan spell execution path
- PostgreSQL persistence (opportunities, jobs, executions, heartbeat, settings)

## 1) Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Arbitrum mainnet RPC endpoint
- WalletConnect Project ID
- Executor private key funded with ETH on Arbitrum (for gas)

## 2) Install

```bash
cd apps/autonomous-arb
npm install
```

## 3) Configure environment

```bash
cp .env.example .env
```

Fill all values in `.env`:

- `DATABASE_URL`
- `ARBITRUM_RPC_URL`
- `NEXT_PUBLIC_ARBITRUM_RPC_URL`
- `EXECUTOR_PRIVATE_KEY`
- `EXECUTOR_ADDRESS`
- `EXECUTOR_ENCRYPTION_KEY`
- `AUTH_SESSION_SECRET` (at least 32 chars random secret for auth cookie signing)
- `ADMIN_WALLETS` (comma-separated lowercased wallets allowed for global pause)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `AAVE_V3_POOL`
- `LIQUIDATION_UNISWAP_FEE_TIER`

## 4) Initialize database

```bash
npm run prisma:generate
npm run prisma:migrate
```

## 5) Run application

Terminal 1 (dashboard/API):

```bash
npm run dev
```

Terminal 2 (autonomous worker):

```bash
npm run worker
```

One-shot worker cycle:

```bash
npm run worker:once
```

## 6) Tests

```bash
npm test
```

## 7) One-time authorization flow (non-coder steps)

1. Open dashboard.
2. Connect wallet on Arbitrum.
3. Create or import DSA.
4. Click **Enable Autonomous Trading**.
5. Sign one transaction from your wallet:
   - DSA `AUTHORITY-A.add(EXECUTOR_ADDRESS)`.
6. Confirm authority status is enabled.
7. Configure strategy mode (`ARBITRAGE`, `LIQUIDATION`, or `HYBRID`) and set strategy enabled.

After that, the backend worker executes trades through delegated authority without asking for per-trade wallet signatures.

---

# Production Runbook

## A) Initial setup

1. Deploy app with valid `.env`.
2. Run DB migrations.
3. Start web app + worker.
4. Verify `GET /api/health` returns `ok`.

## B) One-time authorization

1. User creates/imports DSA.
2. User signs one `AUTHORITY-A.add(executor)` transaction.
3. System verifies `isAuth(executor) == true`.

## C) Enable bot

1. Configure:
   - min net profit
   - max slippage
   - gas ceiling
   - max position size
   - strategy mode (arb/liquidation/hybrid)
   - liquidation trigger health factor
   - liquidation debt/collateral token and amounts
   - allowed pairs
   - cooldown
   - daily loss cap
2. Enable strategy in dashboard.

## D) Monitoring

- Dashboard opportunities table
- Execution history with Arbiscan links
- Worker heartbeat (`/api/health`)
- Structured logs (pino)

## E) Emergency shutdown

- Global pause button (hard stop all strategies), or
- Per-strategy pause, or
- Revoke authority (`AUTHORITY-A.remove(executor)`)

## F) Key rotation

1. Pause strategy globally.
2. Revoke old executor authority.
3. Update `EXECUTOR_PRIVATE_KEY` and `EXECUTOR_ADDRESS`.
4. Restart services.
5. Re-authorize new executor once.
6. Unpause strategy.

## G) Operational hard-stops implemented

- Global emergency pause
- Per-strategy pause
- Daily loss cap
- Gas ceiling
- Quote staleness guard
- Liquidity depth guard
- Per-token exposure cap
- Auto-disable after consecutive failures

## Notes on production behavior

- Chain is hard-locked to **Arbitrum mainnet (42161)**.
- No testnet mode.
- No mock execution mode.
- Worker uses idempotent job keys and retries.
- Executor key remains server-side only.
