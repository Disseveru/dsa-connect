/**
 * Arbitrum One (chainId 42161) configuration.
 * Addresses sourced from ../../src/addresses/arbitrum/
 */

export const ARBITRUM_CHAIN_ID = 42161

/** DSA v2 core contracts on Arbitrum One */
export const ARBITRUM_CORE = {
  index: '0x1eE00C305C51Ff3bE60162456A9B533C07cD9288',
  list: '0x3565F6057b7fFE36984779A507fC87b31EFb0f09',
  read: '0xdF19Da523DA64bBE82eE0E4DFf00d676A8386474',
  versions: {
    2: {
      accountProxy: '0x857f3b524317C0C403EC40e01837F1B160F9E7Ab',
      connectors: '0x67fCE99Dd6d8d659eea2a1ac1b8881c57eb6592B', // InstaConnectorsV2 (M1)
    },
  },
} as const

/** Default DSA address — change this to your own Instadapp Smart Account on Arbitrum One.
 *  This address is pre-filled in the UI as a convenience for the repo owner.
 *  Any user of this app should override it with their own DSA address.
 */
export const DEFAULT_DSA_ADDRESS = '0x8ec919E591192Bb977510d57DBD429E1082A3021'

/** Connector names and their Arbitrum addresses (connectorsV2_M1) */
export const ARBITRUM_CONNECTORS = {
  INSTAPOOL_V5: {
    name: 'INSTAPOOL-C', // Instapool v5 connector key on Arbitrum
    address: '0x33759cF68a3Ab9e8d582d8A4717104848E0fa8B9',
  },
  UNISWAP_V3: {
    name: 'UNISWAP-V3-A',
    address: '0x3254Ce8f5b1c82431B8f21Df01918342215825C2',
  },
  SUSHISWAP: {
    name: 'SUSHISWAP-A',
    address: '0x8a7fCeE0e1Ff6DB33C7E83060c18e3B97915A970',
  },
} as const

/** DEX options supported in v0.1 */
export const SUPPORTED_DEXES = [
  { id: 'uniswap-v3', label: 'Uniswap V3', connector: ARBITRUM_CONNECTORS.UNISWAP_V3 },
  { id: 'sushiswap', label: 'SushiSwap', connector: ARBITRUM_CONNECTORS.SUSHISWAP },
] as const

/** Flashloan connector options supported in v0.1 */
export const SUPPORTED_FLASHLOAN_CONNECTORS = [
  { id: 'instapool-v5', label: 'Instapool V5', connector: ARBITRUM_CONNECTORS.INSTAPOOL_V5 },
] as const

/** Well-known ERC-20 tokens on Arbitrum One (for the arb form) */
export const ARBITRUM_TOKENS = [
  { symbol: 'USDC', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
  { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
  { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
] as const
