import React, { useEffect, useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jmSessionStore } from '@/store/jmSessionStore'
import { OrderbookContent } from './OrderbookContent'
import type { OrderTableEntry } from './OrderbookTable'

const mocks = vi.hoisted(() => {
  const orderbookRefetch = vi.fn()
  const refreshRefetch = vi.fn()

  return {
    developerMode: false,
    orderbookQuery: {
      data: {
        fidelitybonds: [
          {
            amount: 210_000,
            counterparty: 'maker-a',
            locktime: 4_102_444_800,
          },
        ],
        offers: [
          {
            cjfee: 250,
            counterparty: 'maker-a',
            fidelity_bond_value: 42_000,
            maxsize: 200_000,
            minsize: 5_000,
            oid: 0,
            ordertype: 'sw0absoffer',
            txfee: 0,
          },
          {
            cjfee: '0.0005',
            counterparty: 'maker-b',
            fidelity_bond_value: 0,
            maxsize: 500_000,
            minsize: 10_000,
            oid: 1,
            ordertype: 'sw0reloffer',
            txfee: 100,
          },
        ],
      },
      error: undefined as Error | undefined,
      isFetching: false,
      isLoading: false,
      refetch: orderbookRefetch,
    },
    orderbookRefetch,
    refreshQuery: {
      isFetching: false,
      refetch: refreshRefetch,
    },
    refreshRefetch,
  }
})

const translate = vi.hoisted(
  () =>
    // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.hoisted needs this helper inside its factory.
    function translateKey(key: string, options?: Record<string, unknown>) {
      return options ? `${key}:${JSON.stringify(options)}` : key
    },
)

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()

  return {
    ...actual,
    useQuery: vi.fn((options: { queryKey?: string[] }) =>
      options.queryKey?.[0] === 'orderbook-refresh' ? mocks.refreshQuery : mocks.orderbookQuery,
    ),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en', resolvedLanguage: 'en', t: translate },
    t: translate,
  }),
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode
    disabled?: boolean
    onClick?: () => void
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

vi.mock('./OrderbookChart', () => ({
  OrderbookChart: ({ entries }: { entries: OrderTableEntry[] }) => <div>chart:{entries.length}</div>,
}))

vi.mock('./OrderbookTable', () => ({
  OrderbookTable: ({
    globalFilter,
    onChange,
    pinnedEntries,
    selectedEntries,
    tableEntries,
  }: {
    globalFilter: string
    onChange: (table: { getFilteredRowModel: () => { rows: Array<{ original: OrderTableEntry }> } }) => void
    pinnedEntries: OrderTableEntry[]
    selectedEntries: OrderTableEntry[]
    tableEntries: OrderTableEntry[]
  }) => {
    const lastModelKeyRef = useRef<string>()
    const modelKey = `${globalFilter}:${tableEntries.map((entry) => entry.counterparty).join(',')}`

    useEffect(() => {
      if (lastModelKeyRef.current === modelKey) {
        return
      }
      lastModelKeyRef.current = modelKey

      onChange({
        getFilteredRowModel: () => ({
          rows: tableEntries
            .filter((entry) => entry.counterparty.includes(globalFilter))
            .map((entry) => ({ original: entry })),
        }),
      })
    }, [globalFilter, modelKey, onChange, tableEntries])

    return (
      <div>
        table:{tableEntries.length}:selected:{selectedEntries.length}:pinned:{pinnedEntries.length}:filter:
        {globalFilter}
      </div>
    )
  },
}))

describe('OrderbookContent', () => {
  beforeEach(() => {
    mocks.developerMode = false
    mocks.orderbookQuery.error = undefined
    mocks.orderbookQuery.isFetching = false
    mocks.orderbookQuery.isLoading = false
    mocks.orderbookQuery.data = {
      fidelitybonds: [
        {
          amount: 210_000,
          counterparty: 'maker-a',
          locktime: 4_102_444_800,
        },
      ],
      offers: [
        {
          cjfee: 250,
          counterparty: 'maker-a',
          fidelity_bond_value: 42_000,
          maxsize: 200_000,
          minsize: 5_000,
          oid: 0,
          ordertype: 'sw0absoffer',
          txfee: 0,
        },
        {
          cjfee: '0.0005',
          counterparty: 'maker-b',
          fidelity_bond_value: 0,
          maxsize: 500_000,
          minsize: 10_000,
          oid: 1,
          ordertype: 'sw0reloffer',
          txfee: 100,
        },
      ],
    }
    mocks.orderbookRefetch.mockReset()
    mocks.refreshRefetch.mockReset()
    jmSessionStore.setState({ state: { nickname: 'maker-a' } })
  })

  afterEach(() => {
    jmSessionStore.setState({ state: undefined })
  })

  it('renders orderbook summaries and own-offer controls', async () => {
    const user = userEvent.setup()

    render(<OrderbookContent enabled />)

    expect(screen.getByText(/orderbook.text_orderbook_summary/)).toBeInTheDocument()
    expect(screen.getByText('orderbook.market_summary_title')).toBeInTheDocument()
    expect(screen.getByText(/table:2:selected:0:pinned:0/)).toBeInTheDocument()

    await user.click(screen.getByLabelText('orderbook.label_highlight_own_orders'))
    expect(screen.getByText(/table:2:selected:1:pinned:0/)).toBeInTheDocument()

    await screen.findByText('orderbook.label_pin_to_top_own_orders')
    await user.click(screen.getAllByRole('switch')[1])
    expect(screen.getByText(/table:2:selected:1:pinned:1/)).toBeInTheDocument()
  })

  it('filters table rows and reloads the orderbook', async () => {
    const user = userEvent.setup()

    render(<OrderbookContent enabled />)

    await user.type(screen.getByPlaceholderText('orderbook.placeholder_search'), 'maker-b')

    expect(screen.getByText(/orderbook.text_orderbook_summary_filtered/)).toBeInTheDocument()
    expect(screen.getByText(/filter:maker-b/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /orderbook.button_reload_title/ }))
    expect(mocks.orderbookRefetch).toHaveBeenCalledTimes(1)
  })

  it('shows loading, empty, and error states', async () => {
    const user = userEvent.setup()

    mocks.orderbookQuery.isLoading = true
    const { rerender } = render(<OrderbookContent enabled />)
    expect(screen.getByText('global.loading')).toBeInTheDocument()

    mocks.orderbookQuery.isLoading = false
    mocks.orderbookQuery.data = { fidelitybonds: [], offers: [] }
    rerender(<OrderbookContent enabled />)
    expect(screen.getByText('orderbook.alert_empty_orderbook')).toBeInTheDocument()

    mocks.orderbookQuery.error = new Error('boom')
    rerender(<OrderbookContent enabled />)
    expect(screen.getByText(/orderbook.error_loading_orderbook_failed/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /global.retry/ }))
    expect(mocks.orderbookRefetch).toHaveBeenCalledTimes(1)
  })

  it('can add demo entries in developer mode', async () => {
    const user = userEvent.setup()
    mocks.developerMode = true

    render(<OrderbookContent enabled />)

    await user.click(screen.getByRole('button', { name: /Add Demo Entry/ }))

    expect(screen.getByText(/table:3/)).toBeInTheDocument()
  })
})
