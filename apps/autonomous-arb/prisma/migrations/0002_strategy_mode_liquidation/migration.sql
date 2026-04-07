ALTER TABLE "StrategySettings"
ADD COLUMN "strategyMode" TEXT NOT NULL DEFAULT 'ARBITRAGE',
ADD COLUMN "liquidationHealthFactor" DECIMAL(10,4) NOT NULL DEFAULT 1.0500,
ADD COLUMN "liquidationDebtToken" TEXT,
ADD COLUMN "liquidationCollateralToken" TEXT,
ADD COLUMN "liquidationRepayAmount" DECIMAL(36,18),
ADD COLUMN "liquidationWithdrawAmount" DECIMAL(36,18),
ADD COLUMN "liquidationRateMode" INTEGER NOT NULL DEFAULT 2;
