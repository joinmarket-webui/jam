import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
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

const offer = (feeValue: number, isAbsolute: boolean): OrderTableEntry =>
  ({ type: { isAbsolute }, fee: { value: feeValue } }) as unknown as OrderTableEntry

describe('OrderbookChart', () => {
  it('renders nothing when there are no absolute offers', () => {
    const { container } = render(<OrderbookChart entries={[offer(50, false)]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when entries is empty', () => {
    const { container } = render(<OrderbookChart entries={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders fee buckets for absolute offers across ranges', () => {
    render(<OrderbookChart entries={[offer(50, true), offer(20_000, true)]} />)
    expect(screen.getByText('orderbook.chart_title')).toBeInTheDocument()
    expect(screen.getByText('10,000+ sats')).toBeInTheDocument()
  })

  it('renders a single bucket without a trailing range label', () => {
    render(<OrderbookChart entries={[offer(50, true)]} />)
    expect(screen.getByText('orderbook.chart_title')).toBeInTheDocument()
  })
})
