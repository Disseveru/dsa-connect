import DSA from "dsa-connect";
import Web3 from "web3";
import { getServerEnv } from "./env";
import { MAINNET_CHAIN_ID } from "./chain";
import type { ArbitrageOpportunity } from "./types";

const env = getServerEnv();

type DsaLike = {
  Spell: () => {
    add: (spell: { connector: string; method: string; args: unknown[] }) => void;
    cast: () => Promise<string>;
  };
  setInstance: (id: number) => Promise<unknown>;
  getAccounts?: (authority: string) => Promise<Array<{ id: number; address: string; version?: number }>>;
  build?: (params?: { authority?: string; [key: string]: unknown }) => Promise<string>;
  castHelpers?: { estimateGas?: (args: { spells: unknown }) => Promise<number> };
  internal?: { encodeSpells?: (spells: unknown, version?: number, chainId?: number) => { targets: string[]; spells: string[] } };
  instance?: { version?: number; chainId?: number };
  web3?: { eth?: { abi?: { encodeParameters?: (types: string[], values: unknown[]) => string } } };
};

export function createNodeDsa(): DsaLike {
  const web3 = new Web3(new Web3.providers.HttpProvider(env.ARBITRUM_RPC_URL));
  return new DSA({
    web3,
    mode: "node",
    privateKey: env.EXECUTOR_PRIVATE_KEY,
  }) as unknown as DsaLike;
}

export function createBrowserDsa(web3: Web3): DsaLike {
  return new DSA(web3) as unknown as DsaLike;
}

export async function createNodeDsaForAccount(dsaId: number): Promise<DsaLike> {
  const dsa = createNodeDsa();
  await dsa.setInstance(dsaId);
  return dsa;
}

export async function estimateDsaCastGas(dsa: DsaLike, spells: unknown): Promise<number> {
  if (dsa.castHelpers?.estimateGas) {
    return dsa.castHelpers.estimateGas({ spells });
  }
  return 650_000;
}

export function buildFlashLoanArbSpell(dsa: DsaLike, opportunity: ArbitrageOpportunity, _settings?: unknown) {
  const routeSpells = dsa.Spell();
  if (opportunity.sourceDex === "UNISWAP_V3") {
    routeSpells.add({
      connector: "UNISWAP-V3-SWAP-A",
      method: "sell",
      args: [
        opportunity.midToken.address,
        opportunity.borrowToken.address,
        opportunity.uniswapFeeTier,
        opportunity.firstHopUnitAmt.toString(),
        opportunity.borrowAmountWei.toString(),
        0,
        0,
      ],
    });
  } else {
    routeSpells.add({
      connector: "SUSHISWAP-A",
      method: "sell",
      args: [
        opportunity.midToken.address,
        opportunity.borrowToken.address,
        opportunity.borrowAmountWei.toString(),
        opportunity.firstHopUnitAmt.toString(),
        0,
        0,
      ],
    });
  }

  if (opportunity.targetDex === "UNISWAP_V3") {
    routeSpells.add({
      connector: "UNISWAP-V3-SWAP-A",
      method: "sell",
      args: [
        opportunity.borrowToken.address,
        opportunity.midToken.address,
        opportunity.uniswapFeeTier,
        opportunity.secondHopUnitAmt.toString(),
        opportunity.firstHopOut.toString(),
        0,
        0,
      ],
    });
  } else {
    routeSpells.add({
      connector: "SUSHISWAP-A",
      method: "sell",
      args: [
        opportunity.borrowToken.address,
        opportunity.midToken.address,
        opportunity.firstHopOut.toString(),
        opportunity.secondHopUnitAmt.toString(),
        0,
        0,
      ],
    });
  }

  routeSpells.add({
    connector: "INSTAPOOL-C",
    method: "flashPayback",
    args: [opportunity.borrowToken.address, opportunity.borrowAmountWei.toString(), 0, 0],
  });

  const encoded = dsa.internal?.encodeSpells?.(
    routeSpells,
    dsa.instance?.version ?? 2,
    dsa.instance?.chainId ?? MAINNET_CHAIN_ID
  );

  const encodedData =
    encoded && dsa.web3?.eth?.abi?.encodeParameters
      ? dsa.web3.eth.abi.encodeParameters(["string[]", "bytes[]"], [encoded.targets, encoded.spells])
      : "0x";

  const flashSpell = dsa.Spell();
  flashSpell.add({
    connector: "INSTAPOOL-C",
    method: "flashBorrowAndCast",
    args: [
      opportunity.borrowToken.address,
      opportunity.borrowAmountWei.toString(),
      env.INSTAPOOL_ROUTE,
      encodedData,
      "0x",
    ],
  });

  return flashSpell;
}

export type FlashLoanLiquidationConfig = {
  debtToken: `0x${string}`;
  collateralToken: `0x${string}`;
  repayAmountWei: bigint;
  withdrawAmountWei: bigint;
  rateMode: number;
  uniswapFeeTier: number;
};

export function buildFlashLoanLiquidationSpell(dsa: DsaLike, config: FlashLoanLiquidationConfig) {
  const routeSpells = dsa.Spell();
  routeSpells.add({
    connector: "AAVE-V3-A",
    method: "payback",
    args: [config.debtToken, config.repayAmountWei.toString(), config.rateMode, 0, 0],
  });
  routeSpells.add({
    connector: "AAVE-V3-A",
    method: "withdraw",
    args: [config.collateralToken, config.withdrawAmountWei.toString(), 0, 0],
  });
  routeSpells.add({
    connector: "UNISWAP-V3-SWAP-A",
    method: "sell",
    args: [
      config.debtToken,
      config.collateralToken,
      config.uniswapFeeTier,
      "1",
      config.withdrawAmountWei.toString(),
      0,
      0,
    ],
  });
  routeSpells.add({
    connector: "INSTAPOOL-C",
    method: "flashPayback",
    args: [config.debtToken, config.repayAmountWei.toString(), 0, 0],
  });

  const encoded = dsa.internal?.encodeSpells?.(
    routeSpells,
    dsa.instance?.version ?? 2,
    dsa.instance?.chainId ?? MAINNET_CHAIN_ID
  );
  const encodedData =
    encoded && dsa.web3?.eth?.abi?.encodeParameters
      ? dsa.web3.eth.abi.encodeParameters(["string[]", "bytes[]"], [encoded.targets, encoded.spells])
      : "0x";

  const flashSpell = dsa.Spell();
  flashSpell.add({
    connector: "INSTAPOOL-C",
    method: "flashBorrowAndCast",
    args: [config.debtToken, config.repayAmountWei.toString(), env.INSTAPOOL_ROUTE, encodedData, "0x"],
  });
  return flashSpell;
}

export async function executeSpellWithRetries(spells: { cast: (params?: { nonce?: number }) => Promise<string> }) {
  const retries = getServerEnv().MAX_JOB_RETRIES;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < retries) {
    attempt += 1;
    try {
      return await spells.cast();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      const retryable =
        msg.includes("nonce") ||
        msg.includes("replacement transaction underpriced") ||
        msg.includes("already known") ||
        msg.includes("timeout");
      if (!retryable || attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to send cast transaction.");
}
