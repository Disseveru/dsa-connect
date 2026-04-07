# AGENTS.md

## Cursor Cloud specific instructions

This is **dsa-connect**, the official JavaScript/TypeScript SDK for Instadapp's DeFi Smart Accounts. It is a single-package library (not a monorepo).

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Build (Rollup → `dist/`) | `npm run build` |
| TypeScript type-check | `npx tsc --noEmit` |
| Run tests | `npm test` (requires local Ethereum node on port 8545) |
| Run dist tests | `npm run test:dist` (requires build + local node) |
| Dev mode (watch + serve) | `npm run dev` |

### Testing caveats

- All Jest tests (`test/dsa.spec.ts`, `test-dist/`) require a **local Ethereum mainnet fork** running on `localhost:8545`.
- To start the fork: `npm run ganache:fork` or `npm run hardhat:fork`. Both require the environment variables `ETH_NODE_URL` (an Infura/Alchemy mainnet RPC URL) and `PUBLIC_ADDRESS` (an Ethereum address to unlock) set in a `.env` file.
- Without `ETH_NODE_URL`, you can still validate the codebase via `npm run build` and `npx tsc --noEmit`.
- The `bignumber.js` unresolved dependency warning during build is expected and harmless (it's treated as external).

### Build outputs

The Rollup build produces three bundles in `dist/`:
- `index.js` (CommonJS)
- `index.es.js` (ES module)
- `index.bundle.js` (UMD for browsers)
