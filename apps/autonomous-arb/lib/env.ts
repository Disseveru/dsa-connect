import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/autonomous_arb"),
  ARBITRUM_RPC_URL: z.string().url().default("https://arb1.arbitrum.io/rpc"),
  ARBITRUM_PRIVATE_TX_RPC_URL: z.string().url().optional(),
  EXECUTOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  EXECUTOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  EXECUTOR_ENCRYPTION_KEY: z.string().min(32),
  AUTH_SESSION_SECRET: z.string().min(32),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  ADMIN_WALLETS: z.string().default(""),
  INSTAPOOL_ROUTE: z.coerce.number().int().nonnegative().default(5),
  FLASH_LOAN_FEE_BPS: z.coerce.number().nonnegative().default(9),
  MAX_JOB_RETRIES: z.coerce.number().int().positive().default(3),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  WORKER_HEARTBEAT_SECONDS: z.coerce.number().int().positive().default(30),
  UNISWAP_V3_QUOTER_V2: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x61fFE014bA17989E743c5F6cB21bF9697530B21e"),
  UNISWAP_V3_FACTORY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x1F98431c8aD98523631AE4a59f267346ea31F984"),
  SUSHISWAP_ROUTER: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"),
  SUSHISWAP_FACTORY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0xc35DADB65012eC5796536bD9864eD8773aBc74C4"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().default("Arbitrum Autonomous DSA Arb"),
  NEXT_PUBLIC_ARBITRUM_RPC_URL: z.string().url().default("https://arb1.arbitrum.io/rpc"),
});

let cachedServer: z.infer<typeof serverSchema> | null = null;
let cachedPublic: z.infer<typeof publicSchema> | null = null;

export function getServerEnv() {
  if (!cachedServer) cachedServer = serverSchema.parse(process.env);
  return cachedServer;
}

export function getPublicEnv() {
  if (!cachedPublic) cachedPublic = publicSchema.parse(process.env);
  return cachedPublic;
}
