import { AbiItem } from 'web3-utils'

export const LISTA_DAO_A: AbiItem[] = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'Id', name: 'id', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'onBehalf', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amounts', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'shares', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'getId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'setId', type: 'uint256' }
    ],
    name: 'LogBorrow',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'Id', name: 'id', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'onBehalf', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amounts', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'shares', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'getId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'setId', type: 'uint256' }
    ],
    name: 'LogRepay',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'Id', name: 'id', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'onBehalf', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'assets', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'getId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'setId', type: 'uint256' }
    ],
    name: 'LogSupplyCollateral',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'Id', name: 'id', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'onBehalf', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amounts', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'getId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'setId', type: 'uint256' }
    ],
    name: 'LogWithdraw',
    type: 'event'
  },
  {
    inputs: [],
    name: 'MOOLAH',
    outputs: [{ internalType: 'contract IMoolah', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'loanToken', type: 'address' },
          { internalType: 'address', name: 'collateralToken', type: 'address' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' }
        ],
        internalType: 'struct MarketParams',
        name: '_marketParams',
        type: 'tuple'
      },
      { internalType: 'address', name: '_onBehalf', type: 'address' },
      { internalType: 'uint256', name: '_assets', type: 'uint256' },
      { internalType: 'uint256', name: '_getId', type: 'uint256' },
      { internalType: 'uint256', name: '_setId', type: 'uint256' }
    ],
    name: 'borrow',
    outputs: [
      { internalType: 'string', name: '_eventName', type: 'string' },
      { internalType: 'bytes', name: '_eventParam', type: 'bytes' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'loanToken', type: 'address' },
          { internalType: 'address', name: 'collateralToken', type: 'address' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' }
        ],
        internalType: 'struct MarketParams',
        name: '_marketParams',
        type: 'tuple'
      },
      { internalType: 'address', name: '_onBehalf', type: 'address' },
      { internalType: 'uint256', name: '_assets', type: 'uint256' },
      { internalType: 'uint256', name: '_getId', type: 'uint256' },
      { internalType: 'uint256', name: '_setId', type: 'uint256' }
    ],
    name: 'repay',
    outputs: [
      { internalType: 'string', name: '_eventName', type: 'string' },
      { internalType: 'bytes', name: '_eventParam', type: 'bytes' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'loanToken', type: 'address' },
          { internalType: 'address', name: 'collateralToken', type: 'address' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' }
        ],
        internalType: 'struct MarketParams',
        name: '_marketParams',
        type: 'tuple'
      },
      { internalType: 'address', name: '_onBehalf', type: 'address' },
      { internalType: 'uint256', name: '_assets', type: 'uint256' },
      { internalType: 'uint256', name: '_getId', type: 'uint256' },
      { internalType: 'uint256', name: '_setId', type: 'uint256' }
    ],
    name: 'supply',
    outputs: [
      { internalType: 'string', name: '_eventName', type: 'string' },
      { internalType: 'bytes', name: '_eventParam', type: 'bytes' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'loanToken', type: 'address' },
          { internalType: 'address', name: 'collateralToken', type: 'address' },
          { internalType: 'address', name: 'oracle', type: 'address' },
          { internalType: 'address', name: 'irm', type: 'address' },
          { internalType: 'uint256', name: 'lltv', type: 'uint256' }
        ],
        internalType: 'struct MarketParams',
        name: '_marketParams',
        type: 'tuple'
      },
      { internalType: 'address', name: '_onBehalf', type: 'address' },
      { internalType: 'uint256', name: '_assets', type: 'uint256' },
      { internalType: 'uint256', name: '_getId', type: 'uint256' },
      { internalType: 'uint256', name: '_setId', type: 'uint256' }
    ],
    name: 'withdraw',
    outputs: [
      { internalType: 'string', name: '_eventName', type: 'string' },
      { internalType: 'bytes', name: '_eventParam', type: 'bytes' }
    ],
    stateMutability: 'payable',
    type: 'function'
  }
]
