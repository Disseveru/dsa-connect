import Web3 from 'web3'
import DSA from '../src'

describe('Erc20Euler', () => {
  const fromAddress = '0x1111111111111111111111111111111111111111'
  const targetAddress = '0x1111111254EEB25477B68fb85Ed929f73A960582'
  const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const buildDsa = () => {
    const web3 = new Web3('http://localhost:8545')
    const contractMethods = {
      approveSubAccount: jest.fn().mockReturnValue({
        encodeABI: () => '0xapprove',
      }),
    }
    const Contract = jest.fn().mockImplementation(() => ({
      methods: contractMethods,
    }))

    ;(web3.eth as any).Contract = Contract

    const dsa = new DSA({ web3, mode: 'browser' }, 1, { skipChainIdValidation: true })
    jest.spyOn(dsa.internal, 'filterAddress').mockReturnValue(tokenAddress)
    jest.spyOn(dsa.internal, 'getTransactionConfig').mockResolvedValue({
      from: fromAddress,
      to: tokenAddress,
      data: '0xapprove',
      gas: '100000',
      value: 0,
    } as any)

    return { dsa, contractMethods }
  }

  test('rejects subaccount ids above 255', async () => {
    const { dsa } = buildDsa()

    await expect(
      dsa.erc20Euler.approveSubAccTxObj({
        subAccountId: '256',
        token: tokenAddress,
        amount: '1',
        to: targetAddress,
        from: fromAddress,
      }),
    ).rejects.toThrow("'subAccountId' cannot be greater than 255")
  })

  test('rejects malformed subaccount ids', async () => {
    const { dsa } = buildDsa()

    await expect(
      dsa.erc20Euler.approveSubAccTxObj({
        subAccountId: '1.5',
        token: tokenAddress,
        amount: '1',
        to: targetAddress,
        from: fromAddress,
      }),
    ).rejects.toThrow("'subAccountId' must be a valid non-negative integer")
  })

  test('creates approve tx objects for valid subaccount ids', async () => {
    const { dsa, contractMethods } = buildDsa()

    const transactionConfig = await dsa.erc20Euler.approveSubAccTxObj({
      subAccountId: '255',
      token: tokenAddress,
      amount: '1',
      to: targetAddress,
      from: fromAddress,
    })

    expect(contractMethods.approveSubAccount).toHaveBeenCalledWith('255', targetAddress, '1')
    expect(dsa.internal.getTransactionConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        from: fromAddress,
        to: tokenAddress,
        data: '0xapprove',
        value: 0,
      }),
    )
    expect(transactionConfig).toEqual(
      expect.objectContaining({
        data: '0xapprove',
        to: tokenAddress,
      }),
    )
  })
})
