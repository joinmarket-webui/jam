import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EarnReportEntry } from '@/components/earn/report/hooks/useQueryYieldgenReport'
import { withRuntimeLocale } from '@/test/withRuntimeLocale'
import { withTimeZone } from '@/test/withTimeZone'
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

const bucketLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('div[class="font-medium"]')].map((element) => element.textContent)

afterEach(() => {
  vi.useRealTimers()
})

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

  it('buckets entries by local calendar day', () => {
    withRuntimeLocale('en-US', () => {
      withTimeZone('Europe/Berlin', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 0, 15, 10, 0))

        const { container } = render(
          <EarnReportChart
            entries={[
              entry(100, new Date(2026, 0, 13, 23, 59)),
              entry(200, new Date(2026, 0, 14, 0, 0)),
              entry(300, new Date(2026, 0, 14, 23, 59)),
            ]}
            days={3}
          />,
        )

        expect(bucketLabels(container)).toEqual(['Jan 13', 'Jan 14', 'Jan 15'])
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('500')).toBeInTheDocument()
        expect(screen.getByText('earn.report.chart_tooltip_transactions {"count":2}')).toBeInTheDocument()
      })
    })
  })

  it('does not skip the day daylight saving time starts', () => {
    withRuntimeLocale('en-US', () => {
      // 2026-03-08 has 23 hours in New York
      withTimeZone('America/New_York', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 2, 9, 0, 30))

        const { container } = render(<EarnReportChart entries={[entry(1000, new Date(2026, 2, 8, 12, 0))]} days={4} />)

        expect(bucketLabels(container)).toEqual(['Mar 6', 'Mar 7', 'Mar 8', 'Mar 9'])
        expect(screen.getByText('1000')).toBeInTheDocument()
      })
    })
  })

  it('includes the last hour of the day daylight saving time ends', () => {
    withRuntimeLocale('en-US', () => {
      // 2026-11-01 has 25 hours in New York
      withTimeZone('America/New_York', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 10, 2, 12, 0))

        const { container } = render(<EarnReportChart entries={[entry(500, new Date(2026, 10, 1, 23, 30))]} days={3} />)

        expect(bucketLabels(container)).toEqual(['Oct 31', 'Nov 1', 'Nov 2'])
        expect(screen.getByText('500')).toBeInTheDocument()
        expect(screen.getByText('earn.report.chart_tooltip_transactions {"count":1}')).toBeInTheDocument()
      })
    })
  })
})
