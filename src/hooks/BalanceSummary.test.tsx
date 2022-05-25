import React from 'react'
import { render } from '../testUtils'
import { act } from 'react-dom/test-utils'

import { useBalanceSummary, WalletBalanceSummary } from './BalanceSummary'
import { WalletInfo, Utxo } from '../context/WalletContext'

function setup(walletInfo: WalletInfo | null) {
  const returnVal: { data: WalletBalanceSummary | null | undefined } = { data: undefined }
  const TestComponent: React.FunctionComponent = () => {
    returnVal.data = useBalanceSummary(walletInfo)
    return <></>
  }

  render(<TestComponent />)

  return returnVal
}

describe('BalanceSummary', () => {
  it('should handle missing wallet info without errors', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup(null).data
    })

    expect(balanceSummary).toBeNull()
  })

  it('should handle <=v0.9.6 balance format', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup({
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
      }).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('2.00000000')
    expect(balanceSummary!.availableBalance).toBe('1.00000000')
  })

  it('should populate balance properties calculated from utxo data', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup({
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
                locktime: '2099-12',
              } as Utxo,
              {
                value: 3,
                mixdepth: 0,
                confirmations: 0,
                frozen: true,
              } as Utxo,
            ],
          },
          display: {
            walletinfo: {
              wallet_name: 'test.jmdat',
              total_balance: '0.00000006',
              available_balance: '0.00000001',
              accounts: [],
            },
          },
        },
      }).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('0.00000006')
    expect(balanceSummary!.availableBalance).toBe('0.00000001')
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(1)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(5)
    expect(balanceSummary!.accountBalances).toEqual([])
  })

  it('should populate account balance data', () => {
    let balanceSummary: WalletBalanceSummary | null | undefined

    act(() => {
      balanceSummary = setup({
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
              total_balance: '6.66666666',
              available_balance: '3.22222222',
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
                  account_balance: '2.22222222',
                  available_balance: '2.11111111',
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
      }).data
    })

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.totalBalance).toBe('6.66666666')
    expect(balanceSummary!.availableBalance).toBe('3.22222222')
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(322222222)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(344444444)
    expect(balanceSummary!.accountBalances).toHaveLength(4)

    const accountSummaryByIndex = (accountIndex: number) =>
      balanceSummary!.accountBalances!.filter((it) => it.accountIndex === accountIndex).reduce((_, obj) => obj)

    const account0 = accountSummaryByIndex(0)
    expect(account0.accountIndex).toBe(0)
    expect(account0.totalBalance).toBe('0.00000000')
    expect(account0.availableBalance).toBe('0.00000000')
    expect(account0.calculatedAvailableBalanceInSats).toBe(0)
    expect(account0.calculatedFrozenOrLockedBalanceInSats).toBe(0)

    const account1 = accountSummaryByIndex(1)
    expect(account1.accountIndex).toBe(1)
    expect(account1.totalBalance).toBe('1.11111111')
    expect(account1.availableBalance).toBe('1.11111111')
    expect(account1.calculatedAvailableBalanceInSats).toBe(111111111)
    expect(account1.calculatedFrozenOrLockedBalanceInSats).toBe(0)

    const account2 = accountSummaryByIndex(2)
    expect(account2.accountIndex).toBe(2)
    expect(account2.totalBalance).toBe('2.22222222')
    expect(account2.availableBalance).toBe('2.11111111')
    expect(account2.calculatedAvailableBalanceInSats).toBe(211111111)
    expect(account2.calculatedFrozenOrLockedBalanceInSats).toBe(11111111)

    const account3 = accountSummaryByIndex(3)
    expect(account3.accountIndex).toBe(3)
    expect(account3.totalBalance).toBe('3.33333333')
    expect(account3.availableBalance).toBe('0.00000000')
    expect(account3.calculatedAvailableBalanceInSats).toBe(0)
    expect(account3.calculatedFrozenOrLockedBalanceInSats).toBe(333333333)
  })
})
