import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/autonomous_arb",
      ARBITRUM_RPC_URL: "https://arb1.arbitrum.io/rpc",
      NEXT_PUBLIC_ARBITRUM_RPC_URL: "https://arb1.arbitrum.io/rpc",
      EXECUTOR_PRIVATE_KEY: "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce036f9e2aaf5be9a5f74d5",
      EXECUTOR_ADDRESS: "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1",
      EXECUTOR_ENCRYPTION_KEY: "test-encryption-secret-material-32chars",
      AUTH_SESSION_SECRET: "test-auth-session-secret-material-32chars",
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "test-walletconnect-project-id",
      UNISWAP_V3_QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      UNISWAP_V3_FACTORY: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      SUSHISWAP_ROUTER: "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",
      SUSHISWAP_FACTORY: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
