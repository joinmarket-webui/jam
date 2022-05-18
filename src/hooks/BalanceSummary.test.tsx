import React from 'react'
import { render } from '../testUtils'
import { act } from 'react-dom/test-utils'

import { useBalanceSummary, WalletBalanceSummary } from './BalanceSummary'
import { WalletInfo } from '../context/WalletContext'

function setup(walletInfo: WalletInfo | null) {
  const returnVal: unknown = {}
  const TestComponent: React.FunctionComponent = () => {
    const val = useBalanceSummary(walletInfo)
    Object.assign(returnVal, val)
    return <></>
  }

  render(<TestComponent />)

  return returnVal
}

describe('BalanceSummary', () => {
  it('should handle missing wallet info without errors', () => {
    const data = {}

    act(() => {
      Object.assign(data, setup(null))
    })

    const balanceSummary = data as WalletBalanceSummary

    expect(balanceSummary).toBeDefined()
    expect(balanceSummary.totalBalance).toBeNull()
    expect(balanceSummary.availableBalanceDontUseYet).toBeNull()
    expect(balanceSummary.calculatedAvailableBalanceInSats).toBeNull()
    expect(balanceSummary.calculatedFrozenOrLockedBalanceInSats).toBeNull()
    expect(balanceSummary.accountBalances).toBeNull()
  })

  it('should handle new format', () => {
    const data = {}

    act(() => {
      Object.assign(
        data,
        setup({
          data: {
            utxos: {
              utxos: [],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '1.00000001',
                accounts: [],
              },
            },
          },
        })
      )
    })

    const balanceSummary = data as WalletBalanceSummary

    expect(balanceSummary).toBeDefined()
    expect(balanceSummary.totalBalance).toBe('1.00000001')
    expect(balanceSummary.availableBalanceDontUseYet).toBe('1.00000001')
  })

  it('should handle new format if total and available balance differ', () => {
    const data = {}

    act(() => {
      Object.assign(
        data,
        setup({
          data: {
            utxos: {
              utxos: [],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '0.00000001 (1.0000002)',
                accounts: [],
              },
            },
          },
        })
      )
    })

    const balanceSummary = data as WalletBalanceSummary

    expect(balanceSummary).toBeDefined()
    expect(balanceSummary.totalBalance).toBe('1.0000002')
    expect(balanceSummary.availableBalanceDontUseYet).toBe('0.00000001')
  })

  it('should populate properties calculated from utxo data', () => {
    const data = {}

    act(() => {
      Object.assign(
        data,
        setup({
          data: {
            utxos: {
              utxos: [
                {
                  address: '1',
                  path: '1',
                  label: '1',
                  value: 1,
                  tries: 0,
                  tries_remaining: 0,
                  external: false,
                  mixdepth: 0,
                  confirmations: 0,
                  frozen: false,
                  utxo: '1',
                  locktime: undefined,
                },
                {
                  address: '2',
                  path: '2',
                  label: '2 - locked',
                  value: 2,
                  tries: 0,
                  tries_remaining: 0,
                  external: false,
                  mixdepth: 0,
                  confirmations: 0,
                  frozen: false,
                  utxo: '2',
                  locktime: '2099-12',
                },
                {
                  address: '3',
                  path: '3',
                  label: '3 - frozen',
                  value: 3,
                  tries: 0,
                  tries_remaining: 0,
                  external: false,
                  mixdepth: 0,
                  confirmations: 0,
                  frozen: true,
                  utxo: '3',
                },
              ],
            },
            display: {
              walletinfo: {
                wallet_name: 'test.jmdat',
                total_balance: '0.00000001 (0.00000006)',
                accounts: [],
              },
            },
          },
        })
      )
    })

    const balanceSummary = data as WalletBalanceSummary

    expect(balanceSummary).toBeDefined()
    expect(balanceSummary.totalBalance).toBe('0.00000006')
    expect(balanceSummary.availableBalanceDontUseYet).toBe('0.00000001')
    expect(balanceSummary.calculatedAvailableBalanceInSats).toBe(1)
    expect(balanceSummary.calculatedFrozenOrLockedBalanceInSats).toBe(5)
    expect(balanceSummary.accountBalances).toEqual([])
  })
})
