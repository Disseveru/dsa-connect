-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'submitted', 'confirmed', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "wallet" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsaAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dsaId" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 2,
  "authorityEnabled" BOOLEAN NOT NULL DEFAULT false,
  "executorAuthority" TEXT,
  "lastAuthorityCheckAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DsaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dsaAccountId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "strategyPaused" BOOLEAN NOT NULL DEFAULT false,
  "minNetProfitUsd" DECIMAL(18,6) NOT NULL DEFAULT 10,
  "maxSlippageBps" INTEGER NOT NULL DEFAULT 40,
  "gasCeilingGwei" DECIMAL(18,6) NOT NULL DEFAULT 0.2,
  "maxPositionUsd" DECIMAL(18,6) NOT NULL DEFAULT 500,
  "allowedPairs" JSONB NOT NULL,
  "cooldownSeconds" INTEGER NOT NULL DEFAULT 60,
  "dailyLossCapUsd" DECIMAL(18,6) NOT NULL DEFAULT 100,
  "perTokenExposureUsd" JSONB NOT NULL,
  "quoteStaleAfterMs" INTEGER NOT NULL DEFAULT 15000,
  "liquidityDepthBps" INTEGER NOT NULL DEFAULT 700,
  "consecutiveFailureLimit" INTEGER NOT NULL DEFAULT 3,
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "lastExecutedAt" TIMESTAMP(3),
  "lastResetAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrategySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalState" (
  "id" INTEGER NOT NULL,
  "globalPaused" BOOLEAN NOT NULL DEFAULT false,
  "pauseReason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL,
  "sourceDex" TEXT NOT NULL,
  "targetDex" TEXT NOT NULL,
  "borrowToken" TEXT NOT NULL,
  "midToken" TEXT NOT NULL,
  "borrowAmountWei" TEXT NOT NULL,
  "borrowAmountUsd" DECIMAL(18,6) NOT NULL,
  "grossProfitUsd" DECIMAL(18,6) NOT NULL,
  "netProfitUsd" DECIMAL(18,6) NOT NULL,
  "gasCostUsd" DECIMAL(18,6) NOT NULL,
  "flashFeeUsd" DECIMAL(18,6) NOT NULL,
  "slippageImpactUsd" DECIMAL(18,6) NOT NULL,
  "confidenceScore" DECIMAL(5,2) NOT NULL,
  "quoteTimestamp" TIMESTAMP(3) NOT NULL,
  "quoteAgeMs" INTEGER NOT NULL,
  "executable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Execution" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "status" "ExecutionStatus" NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "txHash" TEXT,
  "txNonce" INTEGER,
  "arbiscanUrl" TEXT,
  "borrowToken" TEXT NOT NULL,
  "borrowAmountWei" TEXT NOT NULL,
  "estimatedNetUsd" DECIMAL(18,6) NOT NULL,
  "realizedPnlUsd" DECIMAL(18,6),
  "gasUsed" TEXT,
  "gasPriceWei" TEXT,
  "failureReason" TEXT,
  "routeDescription" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
  "id" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "message" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");
CREATE UNIQUE INDEX "DsaAccount_userId_dsaId_key" ON "DsaAccount"("userId", "dsaId");
CREATE UNIQUE INDEX "StrategySettings_userId_key" ON "StrategySettings"("userId");
CREATE UNIQUE INDEX "StrategySettings_dsaAccountId_key" ON "StrategySettings"("dsaAccountId");
CREATE INDEX "Opportunity_settingsId_createdAt_idx" ON "Opportunity"("settingsId", "createdAt");
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");
CREATE UNIQUE INDEX "Execution_opportunityId_key" ON "Execution"("opportunityId");
CREATE UNIQUE INDEX "Execution_idempotencyKey_key" ON "Execution"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "DsaAccount" ADD CONSTRAINT "DsaAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategySettings" ADD CONSTRAINT "StrategySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategySettings" ADD CONSTRAINT "StrategySettings_dsaAccountId_fkey" FOREIGN KEY ("dsaAccountId") REFERENCES "DsaAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "StrategySettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "StrategySettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed singleton global state row.
INSERT INTO "GlobalState" ("id", "globalPaused", "pauseReason", "updatedAt")
VALUES (1, false, NULL, NOW())
ON CONFLICT ("id") DO NOTHING;
