import React from 'react'
import { render } from '../testUtils'
import { act } from 'react-dom/test-utils'

import { useBalanceSummary, WalletBalanceSummary } from './BalanceSummary'
import { WalletInfo, Utxo } from '../context/WalletContext'

const now = Date.UTC(2009, 0, 3)

describe('BalanceSummary', () => {
  function setup(walletInfo: WalletInfo | null, refTime: number) {
    const returnVal: { data: WalletBalanceSummary | null | undefined } = { data: undefined }
    const TestComponent: React.FunctionComponent = () => {
      returnVal.data = useBalanceSummary(walletInfo, refTime)
      return <></>
    }

    render(<TestComponent />)

    return returnVal
  }

  it('should handle missing wallet info without errors', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup(null, now).data
    })

    expect(balanceSummary).toBeNull()
  })

  it('should handle <=v0.9.6 balance format', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup(
        {
          balanceSummary: {} as WalletBalanceSummary,
          addressSummary: {},
          data: {
            utxos: {
              utxos: [],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '2.00000000',
                available_balance: '1.00000000',
                accounts: [],
              },
            },
          },
        },
        now
      ).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('2.00000000')
    expect(balanceSummary!.availableBalance).toBe('1.00000000')
  })

  it('should populate balance properties calculated from utxo data', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup(
        {
          balanceSummary: {} as WalletBalanceSummary,
          addressSummary: {},
          data: {
            utxos: {
              utxos: [
                {
                  value: 1,
                  mixdepth: 0,
                  frozen: false,
                } as Utxo,
                {
                  value: 2,
                  mixdepth: 0,
                  frozen: false,
                  // unfrozen but not yet expired
                  locktime: '2999-12',
                  path: `m/84'/1'/0'/0/2:${now / 1_000 + 1}`,
                } as Utxo,
                {
                  value: 3,
                  mixdepth: 0,
                  confirmations: 0,
                  frozen: true,
                } as Utxo,
                {
                  value: 4,
                  mixdepth: 0,
                  // unfrozen and expired
                  frozen: false,
                  locktime: '2009-01',
                  path: `m/84'/1'/0'/0/2:${now / 1_000 - 1}`,
                } as Utxo,
              ],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '0.00000010',
                available_balance: '0.00000005',
                accounts: [],
              },
            },
          },
        },
        now
      ).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('0.00000010')
    expect(balanceSummary!.availableBalance).toBe('0.00000005')
    expect(balanceSummary!.calculatedTotalBalanceInSats).toBe(10)
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(5)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(5)
    expect(balanceSummary!.accountBalances).toEqual({})
  })

  it('should populate account balance data', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup(
        {
          balanceSummary: {} as WalletBalanceSummary,
          addressSummary: {},
          data: {
            utxos: {
              utxos: [
                {
                  value: 111111111,
                  mixdepth: 1,
                } as Utxo,
                {
                  value: 222222222,
                  mixdepth: 2,
                } as Utxo,
                {
                  value: 11111111,
                  mixdepth: 2,
                  frozen: true,
                } as Utxo,
                {
                  value: 333333333,
                  mixdepth: 3,
                  confirmations: 0,
                  frozen: true,
                } as Utxo,
              ],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '6.77777777',
                available_balance: '3.33333333',
                accounts: [
                  {
                    account: '0',
                    account_balance: '0.00000000',
                    available_balance: '0.00000000',
                    branches: [],
                  },
                  {
                    account: '1',
                    account_balance: '1.11111111',
                    available_balance: '1.11111111',
                    branches: [],
                  },
                  {
                    account: '2',
                    account_balance: '2.33333333',
                    available_balance: '2.22222222',
                    branches: [],
                  },
                  {
                    account: '3',
                    account_balance: '3.33333333',
                    available_balance: '0.00000000',
                    branches: [],
                  },
                ],
              },
            },
          },
        },
        now
      ).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('6.77777777')
    expect(balanceSummary!.availableBalance).toBe('3.33333333')
    expect(balanceSummary!.calculatedTotalBalanceInSats).toBe(677777777)
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(333333333)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(344444444)
    expect(Object.keys(balanceSummary!.accountBalances)).toHaveLength(4)

    const account0 = balanceSummary!.accountBalances[0]
    expect(account0.accountIndex).toBe(0)
    expect(account0.totalBalance).toBe('0.00000000')
    expect(account0.availableBalance).toBe('0.00000000')
    expect(account0.calculatedTotalBalanceInSats).toBe(0)
    expect(account0.calculatedAvailableBalanceInSats).toBe(0)
    expect(account0.calculatedFrozenOrLockedBalanceInSats).toBe(0)

    const account1 = balanceSummary!.accountBalances[1]
    expect(account1.accountIndex).toBe(1)
    expect(account1.totalBalance).toBe('1.11111111')
    expect(account1.availableBalance).toBe('1.11111111')
    expect(account1.calculatedTotalBalanceInSats).toBe(111111111)
    expect(account1.calculatedAvailableBalanceInSats).toBe(111111111)
    expect(account1.calculatedFrozenOrLockedBalanceInSats).toBe(0)

    const account2 = balanceSummary!.accountBalances[2]
    expect(account2.accountIndex).toBe(2)
    expect(account2.totalBalance).toBe('2.33333333')
    expect(account2.availableBalance).toBe('2.22222222')
    expect(account2.calculatedTotalBalanceInSats).toBe(233333333)
    expect(account2.calculatedAvailableBalanceInSats).toBe(222222222)
    expect(account2.calculatedFrozenOrLockedBalanceInSats).toBe(11111111)

    const account3 = balanceSummary!.accountBalances[3]
    expect(account3.accountIndex).toBe(3)
    expect(account3.totalBalance).toBe('3.33333333')
    expect(account3.availableBalance).toBe('0.00000000')
    expect(account3.calculatedTotalBalanceInSats).toBe(333333333)
    expect(account3.calculatedAvailableBalanceInSats).toBe(0)
    expect(account3.calculatedFrozenOrLockedBalanceInSats).toBe(333333333)
  })
})
