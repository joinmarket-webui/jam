import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderbookChart } from './OrderbookChart'
import type { OrderTableEntry } from './OrderbookTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const offer = (counterparty: string, feeValue: number, type: 'relative' | 'absolute', bondValue = 1): OrderTableEntry =>
  ({
    counterparty,
    type: { isAbsolute: type === 'absolute', isRelative: type === 'relative' },
    fee: { value: feeValue },
    bondValue: { value: bondValue },
  }) as unknown as OrderTableEntry

describe('OrderbookChart', () => {
  it('renders nothing when entries are empty', () => {
    const { container } = render(<OrderbookChart entries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('quantizes the cheapest offer per bonded maker and switches fee modes', async () => {
    const user = userEvent.setup()
    render(
      <OrderbookChart
        entries={[
          offer('alice', 0.0001, 'relative'),
          offer('alice', 0.0002, 'relative'),
          offer('bob', 0.00009, 'relative'),
          offer('mallory', 0.0001, 'relative', 0),
          offer('dave', 0.2, 'relative'),
          offer('carol', 100, 'absolute'),
        ]}
      />,
    )

    expect(screen.getByText('orderbook.chart_exact_summary {"exact":1,"total":3}')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'orderbook.chart_tooltip {"fee":"0.01%","exact":1,"near":1}',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'orderbook.chart_tooltip_above {"count":1}' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'orderbook.chart_absolute_offers' }))

    expect(screen.getByText('orderbook.chart_exact_summary {"exact":1,"total":1}')).toBeInTheDocument()
    expect(screen.getByText('orderbook.chart_absolute_axis')).toBeInTheDocument()
  })
})
