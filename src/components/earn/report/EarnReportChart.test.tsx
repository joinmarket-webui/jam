import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EarnReportEntry } from '@/components/earn/report/hooks/useQueryYieldgenReport'
import { EarnReportChart } from './EarnReportChart'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const entry = (earnedAmount: number | null, timestamp: Date): EarnReportEntry =>
  ({ earnedAmount, timestamp }) as unknown as EarnReportEntry

describe('EarnReportChart', () => {
  it('renders nothing when there is no earned data', () => {
    const { container } = render(<EarnReportChart entries={[entry(0, new Date())]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when days is negative', () => {
    const { container } = render(<EarnReportChart entries={[entry(1000, new Date())]} days={-1} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the chart with a title when earned data exists', () => {
    render(<EarnReportChart entries={[entry(1000, new Date())]} days={7} />)
    expect(screen.getByText(/earn.report.chart_title_days/)).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
  })

  it('ignores entries with null earnedAmount', () => {
    const { container } = render(<EarnReportChart entries={[entry(null, new Date())]} />)
    expect(container.firstChild).toBeNull()
  })
})
