import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '../testUtils'
import { act } from 'react-dom/test-utils'

import * as apiMock from '../libs/JmWalletApi'
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
  })
})
