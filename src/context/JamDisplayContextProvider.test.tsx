import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { withRuntimeLocale } from '@/test/withRuntimeLocale'
import { useJamDisplayContext } from './JamDisplayContext'
import { JamDisplayContextProvider } from './JamDisplayContextProvider'

const DisplayProbe = () => {
  const displayContext = useJamDisplayContext()

  return (
    <div>
      <span data-testid="default-amount">{displayContext.formatAmount({ amount: 123_456_789 })}</span>
      <span data-testid="btc-amount">{displayContext.formatAmount({ amount: 123_456_789, convertToUnit: 'btc' })}</span>
      <span data-testid="hidden-amount">{displayContext.formatAmount({ amount: 123_456_789, hidden: true })}</span>
      <span data-testid="currency-symbol">{displayContext.currencySymbol()}</span>
    </div>
  )
}

describe('JamDisplayContextProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    jamSettingsStore.getState().clear()
  })

  it('should format amounts with the current display settings', () => {
    withRuntimeLocale('en-US', () => {
      render(
        <JamDisplayContextProvider>
          <DisplayProbe />
        </JamDisplayContextProvider>,
      )

      expect(screen.getByTestId('default-amount')).toHaveTextContent('123,456,789')
      expect(screen.getByTestId('btc-amount')).toHaveTextContent('1.23456789')
      expect(screen.getByTestId('hidden-amount')).toHaveTextContent('*****')
      expect(screen.getByTestId('sats-symbol')).toBeInTheDocument()
    })
  })

  it('should hide default amounts when privacy mode is enabled', () => {
    jamSettingsStore.getState().update({ privateMode: true })

    render(
      <JamDisplayContextProvider>
        <DisplayProbe />
      </JamDisplayContextProvider>,
    )

    expect(screen.getByTestId('default-amount')).toHaveTextContent('*****')
    expect(screen.getByTestId('btc-amount')).toHaveTextContent('*****')
    expect(screen.queryByTestId('sats-symbol')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bitcoin-symbol')).not.toBeInTheDocument()
  })
})
