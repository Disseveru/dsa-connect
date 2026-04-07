import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { appChain, ensureArbitrumMainnet } from "./chain";
import { getServerEnv } from "./env";

const env = getServerEnv();

export const publicClient = createPublicClient({
  chain: appChain,
  transport: http(env.ARBITRUM_RPC_URL),
});

const txRpcUrl = env.ARBITRUM_PRIVATE_TX_RPC_URL ?? env.ARBITRUM_RPC_URL;

export const executorAccount = privateKeyToAccount(env.EXECUTOR_PRIVATE_KEY as `0x${string}`);

if (executorAccount.address.toLowerCase() !== env.EXECUTOR_ADDRESS.toLowerCase()) {
  // Keep build/runtime boot resilient; execution routes still expose this mismatch.
  console.warn("EXECUTOR_ADDRESS does not match EXECUTOR_PRIVATE_KEY.");
}

export const executorWalletClient = createWalletClient({
  account: executorAccount,
  chain: appChain,
  transport: http(txRpcUrl),
});

export async function assertMainnetClients() {
  const [pubChainId, walletChainId] = await Promise.all([
    publicClient.getChainId(),
    executorWalletClient.getChainId(),
  ]);
  ensureArbitrumMainnet(pubChainId);
  ensureArbitrumMainnet(walletChainId);
}
