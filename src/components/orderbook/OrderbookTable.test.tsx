import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

vi.mock('@/components/ui/jam/TablePagination', () => ({
  TablePagination: ({
    currentPage,
    itemsPerPage,
    onItemsPerPageChange,
    onPageChange,
    totalItems,
    totalPages,
  }: {
    currentPage: number
    itemsPerPage: number
    onItemsPerPageChange: (itemsPerPage: number) => void
    onPageChange: (page: number) => void
    totalItems: number
    totalPages: number
  }) => (
    <div>
      pagination:{currentPage}/{totalPages}:{itemsPerPage}:{totalItems}
      <button onClick={() => onPageChange(2)}>page-two</button>
      <button onClick={() => onItemsPerPageChange(-1)}>show-all</button>
      <button onClick={() => onItemsPerPageChange(10)}>page-size-ten</button>
    </div>
  ),
}))

const makeEntry = (overrides: Partial<OrderTableEntry>): OrderTableEntry => ({
  bondValue: {
    amount: 0,
    displayValue: '0',
    value: 0,
  },
  counterparty: 'maker-a',
  fee: {
    displayValue: '250',
    value: 250,
  },
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
  ...overrides,
})

const absoluteEntry = makeEntry({
  bondValue: {
    amount: 21_000,
    displayExpiresIn: 'tomorrow',
    displayLocktime: 'locktime',
    displayValue: '42',
    value: 42,
  },
  counterparty: 'maker-a',
  orderId: '2',
})

const relativeEntry = makeEntry({
  counterparty: 'maker-b',
  fee: {
    displayValue: '0.0005%',
    value: 0.0005,
  },
  maximumSize: '500000',
  minerFeeContribution: '100',
  minimumSize: '10000',
  orderId: '1',
  type: {
    badgeColor: 'secondary',
    displayValue: 'relative',
    isAbsolute: false,
    isRelative: true,
    tooltip: 'Native SW Relative Fee',
    value: 'sw0reloffer',
  },
})

describe('OrderbookTable', () => {
  it('renders, pins, highlights, filters, and notifies table changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <OrderbookTable
        globalFilter="maker"
        tableEntries={[relativeEntry, absoluteEntry]}
        selectedEntries={[relativeEntry]}
        pinnedEntries={[absoluteEntry]}
        onChange={onChange}
      />,
    )

    expect(screen.getByText('maker-a')).toBeInTheDocument()
    expect(screen.getByText('maker-b')).toBeInTheDocument()
    expect(screen.getByText('0.0005%')).toBeInTheDocument()
    expect(screen.getByText('Native SW Absolute Fee')).toBeInTheDocument()
    expect(screen.getByText('pagination:1/1:25:2')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()

    await user.click(screen.getByText('orderbook.table.heading_counterparty'))
    await user.click(screen.getByText('show-all'))
    await waitFor(() => expect(screen.getByText('pagination:1/1:-1:2')).toBeInTheDocument())

    await user.click(screen.getByText('page-size-ten'))
    await waitFor(() => expect(screen.getByText('pagination:1/1:10:2')).toBeInTheDocument())
  })

  it('sorts by each sortable column and changes pages', async () => {
    const user = userEvent.setup()
    render(<OrderbookTable tableEntries={[relativeEntry, absoluteEntry]} selectedEntries={[]} pinnedEntries={[]} />)

    for (const heading of [
      'orderbook.table.heading_counterparty',
      'orderbook.table.heading_type',
      'orderbook.table.heading_fee',
      'orderbook.table.heading_minimum_size',
      'orderbook.table.heading_maximum_size',
      'orderbook.table.heading_bond_value',
      'orderbook.table.heading_order_id',
    ]) {
      const header = screen.queryByText(heading)
      if (header) {
        await user.click(header)
        await user.click(header)
      }
    }

    await user.click(screen.getByText('page-two'))
    expect(screen.getByText('orderbook.table.heading_counterparty')).toBeInTheDocument()
  })

  it('keeps the normal scrollable table on mobile-sized layouts', async () => {
    const user = userEvent.setup()
    const firstEntry = makeEntry({
      bondValue: {
        amount: 0,
        displayValue: '7',
        value: 7,
      },
      counterparty: 'same-maker',
      fee: {
        displayValue: '100',
        value: 100,
      },
      orderId: '2',
    })
    const secondEntry = makeEntry({
      counterparty: 'same-maker',
      fee: {
        displayValue: '900',
        value: 900,
      },
      orderId: '1',
    })

    render(<OrderbookTable tableEntries={[firstEntry, secondEntry]} selectedEntries={[]} pinnedEntries={[]} />)

    expect(screen.getByRole('table')).toHaveClass('min-w-[42rem]')
    expect(screen.getByText('orderbook.table.heading_minimum_size')).toBeInTheDocument()
    expect(screen.getByText('orderbook.table.heading_maximum_size')).toBeInTheDocument()
    expect(screen.getByText('orderbook.table.heading_bond_value')).toBeInTheDocument()
    expect(screen.queryByText('orderbook.table.heading_miner_fee_contribution')).not.toBeInTheDocument()

    await user.click(screen.getByText('orderbook.table.heading_counterparty'))
    await user.click(screen.getByText('orderbook.table.heading_fee'))
    await user.click(screen.getByText('orderbook.table.heading_fee'))
  })

  it('handles showing all rows when the filtered table is empty', async () => {
    const user = userEvent.setup()

    render(<OrderbookTable tableEntries={[]} selectedEntries={[]} pinnedEntries={[]} />)

    await user.click(screen.getByText('show-all'))
    await waitFor(() => expect(screen.getByText('pagination:1/0:-1:0')).toBeInTheDocument())
  })

  it('filters rows and handles empty pinned row models', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    render(
      <OrderbookTable
        globalFilter="maker-b"
        tableEntries={[relativeEntry]}
        selectedEntries={[]}
        pinnedEntries={[absoluteEntry]}
      />,
    )

    expect(screen.queryByText('maker-a')).not.toBeInTheDocument()
    expect(screen.getByText('maker-b')).toBeInTheDocument()
    expect(debugSpy).not.toHaveBeenCalled()

    debugSpy.mockRestore()
  })
})
