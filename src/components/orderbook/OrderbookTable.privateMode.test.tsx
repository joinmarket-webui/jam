import type React from 'react'
import { StrictMode } from 'react'
import '@testing-library/jest-dom/vitest'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'
import { withRuntimeLocale } from '@/test/withRuntimeLocale'
import { OrderbookTable, type OrderTableEntry } from './OrderbookTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/jam/TablePagination', () => ({
  TablePagination: () => null,
}))

// Private mode ON. Orderbook values are public market data and must stay
// readable (see issue #1453). vi.mock factories are hoisted above all imports,
// so the store stub has to be built inside vi.hoisted.
const mockStore = vi.hoisted(() => {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- needs to live inside the hoisted stub
  const noop = () => {}
  const storeState = {
    state: {
      currencyUnit: 'sats',
      privateMode: true,
      addressChunking: true,
    },
    update: noop,
    clear: noop,
  }
  return {
    // getState must return a stable reference or useSyncExternalStore loops.
    getState: () => storeState,
    subscribe: () => noop,
  }
})

vi.mock('@/store/jamSettingsStore', () => ({
  jamSettingsStore: mockStore,
  useDeveloperMode: () => ({ enabled: false }),
}))

const entry: OrderTableEntry = {
  bondValue: { amount: 0, displayValue: '0', value: 0 },
  counterparty: 'maker-a',
  fee: { displayValue: '250', value: 250 },
  maximumSize: '200000',
  minerFeeContribution: '0',
  minimumSize: '5000',
  orderId: '0',
  type: {
    badgeColor: 'default',
    displayValue: 'absolute',
    isAbsolute: true,
    isRelative: false,
    tooltip: 'Native SW Absolute Fee',
    value: 'sw0absoffer',
  },
}

describe('OrderbookTable in private mode', () => {
  it('shows orderbook balances even though private mode is enabled', async () => {
    await withRuntimeLocale('en-US', async () => {
      render(
        <StrictMode>
          <JamDisplayContextProvider>
            <OrderbookTable tableEntries={[entry]} selectedEntries={[]} pinnedEntries={[]} />
          </JamDisplayContextProvider>
        </StrictMode>,
      )

      // absolute fee, min size and max size render as plain sats values,
      // not the private-mode mask
      await waitFor(() => {
        expect(document.querySelector('[data-raw-value="250"]')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(document.querySelector('[data-raw-value="5000"]')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(document.querySelector('[data-raw-value="200000"]')).toBeInTheDocument()
      })
    })
  })
})
