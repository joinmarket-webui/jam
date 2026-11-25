import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTimeZone } from '@/test/withTimeZone'
import { EarnReportContent } from './EarnReportContent'
import type { EarnReportEntry } from './hooks/useQueryYieldgenReport'

const mocks = vi.hoisted(() => ({
  createObjectURL: vi.fn<(blob: Blob) => string>(() => 'blob:earn-report'),
  developerMode: false,
  entries: [] as EarnReportEntry[],
  error: vi.fn<() => Error | null>(() => null),
  isLoading: false,
  isRefetching: false,
  refetch: vi.fn<() => Promise<void>>(),
  revokeObjectURL: vi.fn<(url: string) => void>(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('@/components/dev/DevBadge', () => ({
  DevBadge: () => <span>dev-badge</span>,
}))

vi.mock('@/components/earn/report/hooks/useQueryYieldgenReport', () => ({
  useQueryYieldgenReport: ({ enabled }: { enabled: boolean }) => ({
    data: enabled ? mocks.entries : undefined,
    error: mocks.error(),
    isLoading: mocks.isLoading,
    isRefetching: mocks.isRefetching,
    refetch: mocks.refetch,
  }),
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>balance:{valueString}</span>,
}))

vi.mock('@/components/ui/jam/SortIcon', () => ({
  SortIcon: () => <span>sort-icon</span>,
}))

vi.mock('@/components/ui/jam/TablePagination', () => ({
  TablePagination: ({
    onItemsPerPageChange,
    onPageChange,
    totalItems,
  }: {
    onItemsPerPageChange: (itemsPerPage: number) => void
    onPageChange: (page: number) => void
    totalItems: number
  }) => (
    <div>
      pagination:{totalItems}
      <button type="button" onClick={() => onPageChange(1)}>
        first-page
      </button>
      <button type="button" onClick={() => onItemsPerPageChange(-1)}>
        show-all
      </button>
      <button type="button" onClick={() => onItemsPerPageChange(25)}>
        show-page-size
      </button>
    </div>
  ),
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div>spinner</div>,
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

vi.mock('./EarnReportChart', () => ({
  EarnReportChart: ({ entries }: { entries: EarnReportEntry[] }) => <div>chart:{entries.length}</div>,
}))

const entry = (overrides: Partial<EarnReportEntry>): EarnReportEntry => ({
  cjTotalAmount: 50_000,
  confirmationDuration: 12,
  earnedAmount: 100,
  fee: 0,
  inputAmount: 30_000,
  inputCount: 2,
  notes: null,
  timestamp: new Date('2026-06-13T12:00:00.000Z'),
  ...overrides,
})

describe('EarnReportContent', () => {
  beforeEach(() => {
    mocks.error.mockReturnValue(null)
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-14T12:00:00.000Z').getTime())
    mocks.developerMode = false
    mocks.entries = [
      entry({ earnedAmount: 100, notes: 'first maker note' }),
      entry({ earnedAmount: 200, notes: 'second maker note', timestamp: new Date('2026-05-30T12:00:00.000Z') }),
      entry({ earnedAmount: 300, notes: 'old maker note', timestamp: new Date('2026-01-01T12:00:00.000Z') }),
    ]
    mocks.isLoading = false
    mocks.isRefetching = false
    mocks.refetch.mockReset()
    mocks.refetch.mockResolvedValue(undefined)
    mocks.createObjectURL.mockClear()
    mocks.revokeObjectURL.mockClear()
    // jsdom does not implement navigation, which clicking the download anchor would trigger
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: mocks.createObjectURL,
      },
      revokeObjectURL: {
        configurable: true,
        value: mocks.revokeObjectURL,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not call a failed report empty', () => {
    mocks.entries = []
    mocks.error.mockReturnValue(new Error('Unavailable'))
    render(<EarnReportContent enabled />)
    expect(screen.getByRole('alert')).toHaveTextContent('earn.report.error_loading')
    expect(screen.queryByText('earn.alert_empty_report')).not.toBeInTheDocument()
  })

  it('shows a refresh error without discarding loaded entries', () => {
    mocks.entries = [entry({ earnedAmount: 123 })]
    mocks.error.mockReturnValue(new Error('Unavailable'))
    render(<EarnReportContent enabled />)
    expect(screen.getByRole('alert')).toHaveTextContent('earn.report.error_loading')
    expect(screen.getByText('chart:1')).toBeInTheDocument()
  })

  it('renders loading and report states', () => {
    mocks.isLoading = true
    mocks.isRefetching = false
    mocks.entries = []
    const { rerender } = render(<EarnReportContent enabled />)

    expect(screen.getByText('spinner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'global.refresh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'global.download' })).not.toBeInTheDocument()

    mocks.isLoading = false
    mocks.isRefetching = true
    mocks.entries = []
    rerender(<EarnReportContent enabled />)

    expect(screen.getByText('earn.alert_empty_report')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'global.refresh' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'global.download' })).toBeDisabled()

    mocks.isLoading = false
    mocks.isRefetching = false
    mocks.entries = []
    rerender(<EarnReportContent enabled />)

    expect(screen.queryByText('earn.alert_empty_report')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'global.refresh' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'global.download' })).toBeDisabled()

    mocks.isLoading = false
    mocks.isRefetching = false
    mocks.entries = [entry({ earnedAmount: 100, notes: 'first maker note' })]
    rerender(<EarnReportContent enabled />)

    expect(screen.queryByText('earn.alert_empty_report')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'global.refresh' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'global.download' })).toBeEnabled()
  })

  it('summarizes, filters, refreshes, paginates, and exports report rows', async () => {
    const anchorClick = vi.fn()
    const createElement = vi.spyOn(document, 'createElement')
    createElement.mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: anchorClick,
        })
      }
      return element
    })

    render(<EarnReportContent enabled className="custom-report" />)

    expect(screen.getByText('chart:3')).toBeInTheDocument()
    expect(screen.getByText('balance:600')).toBeInTheDocument()
    expect(screen.getAllByText('balance:300').length).toBeGreaterThan(0)
    expect(screen.getByText('earn.report.text_report_summary:{"count":3}')).toBeInTheDocument()
    expect(screen.queryByText(/earn\.report\.text_report_summary_filtered:/u)).not.toBeInTheDocument()
    expect(screen.getByText('first maker note')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('earn.report.placeholder_search'), {
      target: { value: 'second' },
    })

    expect(screen.queryByText(/earn\.report\.text_report_summary:/u)).not.toBeInTheDocument()
    expect(screen.getByText('earn.report.text_report_summary_filtered:{"count":1}')).toBeInTheDocument()
    expect(screen.queryByText('first maker note')).not.toBeInTheDocument()
    expect(screen.getByText('second maker note')).toBeInTheDocument()

    const downloadButton = screen.getByRole('button', { name: 'global.download' })
    expect(downloadButton).toBeEnabled()

    fireEvent.click(downloadButton)
    expect(mocks.createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'first-page' }))
    fireEvent.click(screen.getByRole('button', { name: 'show-all' }))
    fireEvent.click(screen.getByRole('button', { name: 'show-page-size' }))

    const refreshButton = screen.getByRole('button', { name: 'global.refresh' })
    expect(refreshButton).toBeEnabled()

    fireEvent.click(refreshButton)

    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled())
    createElement.mockRestore()
  })

  it('exports all filtered rows regardless of pagination', async () => {
    mocks.entries = Array.from({ length: 30 }, (_, index) =>
      entry({
        notes: `maker note ${index + 1}`,
        timestamp: new Date(Date.UTC(2026, 0, index + 1, 12)),
      }),
    )

    render(<EarnReportContent enabled />)

    expect(screen.getByText('pagination:30')).toBeInTheDocument()
    expect(screen.getAllByText(/maker note/u)).toHaveLength(25)

    fireEvent.click(screen.getByRole('button', { name: 'global.download' }))

    const blob = mocks.createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    if (!blob) {
      throw new Error('CSV blob was not created')
    }

    const csv = await blob.text()
    const lines = csv.trim().split('\n')

    expect(lines).toHaveLength(31)
    expect(lines[1]).toContain('2026-01-30T12:00:00.000Z')
    expect(lines.at(-1)).toContain('2026-01-01T12:00:00.000Z')
  })

  it('renders and exports rows with an invalid timestamp', async () => {
    mocks.entries = [
      entry({ notes: 'valid maker note' }),
      entry({ notes: 'invalid maker note', timestamp: new Date('invalid') }),
    ]

    render(<EarnReportContent enabled />)

    expect(screen.getByText('valid maker note')).toBeInTheDocument()
    expect(screen.getByText('invalid maker note')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
    // rows without a valid timestamp still count towards the all-time total
    expect(screen.getByText('balance:200')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'global.download' }))

    const blob = mocks.createObjectURL.mock.calls[0]?.[0]
    if (!blob) {
      throw new Error('CSV blob was not created')
    }

    const csv = await blob.text()
    const lines = csv.trim().split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[1]).toMatch(/^2026-06-13T12:00:00.000Z,/u)
    expect(lines[2]).toMatch(/^,.*invalid maker note$/u)
  })

  it('adds demo rows in developer mode', () => {
    mocks.developerMode = true

    render(<EarnReportContent enabled />)

    expect(screen.getByText('dev-badge')).toBeInTheDocument()
    expect(screen.getByText('earn.report.text_report_summary:{"count":3}')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add Demo Entry/u }))

    expect(screen.getByText('earn.report.text_report_summary:{"count":4}')).toBeInTheDocument()
  })

  it('never shows a demo row with a larger input amount than its coinjoin amount', async () => {
    mocks.developerMode = true
    // a large first draw followed by a small one would expose a second, independent coinjoin amount
    const random = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5)

    try {
      render(<EarnReportContent enabled />)
      fireEvent.click(screen.getByRole('button', { name: /Add Demo Entry/u }))
      fireEvent.click(screen.getByRole('button', { name: 'global.download' }))

      const blob = mocks.createObjectURL.mock.calls[0]?.[0]
      if (!blob) {
        throw new Error('CSV blob was not created')
      }

      const csv = await blob.text()
      // demo rows have no notes, unlike the report rows of this test
      const demoRow = csv
        .trim()
        .split('\n')
        .slice(1)
        .find((line) => line.endsWith(','))
      if (!demoRow) {
        throw new Error('Demo row was not exported')
      }

      const [, cjAmount, , inputAmount] = demoRow.split(',').map(Number)
      expect(inputAmount).toBeGreaterThan(0)
      expect(inputAmount).toBeLessThanOrEqual(cjAmount)
    } finally {
      random.mockRestore()
    }
  })

  it('aligns 30-day and 90-day earnings cutoff to start of day', () => {
    withTimeZone('UTC', () => {
      // Current time at 18:00:00 on April 10, 2026
      const mockNow = new Date('2026-04-10T18:00:00.000Z').getTime()
      vi.spyOn(Date, 'now').mockReturnValue(mockNow)

      // 29 days ago in calendar math from April 10 is March 12
      // Entry on March 12 at 06:00:00 UTC (earlier than 18:00:00)
      const entry30DaysAgoMorning = entry({
        earnedAmount: 250,
        timestamp: new Date('2026-03-12T06:00:00.000Z'),
      })

      // 89 days ago in calendar math from April 10 is January 11
      // Entry on January 11 at 04:00:00 UTC
      const entry90DaysAgoMorning = entry({
        earnedAmount: 500,
        timestamp: new Date('2026-01-11T04:00:00.000Z'),
      })

      // day before each cutoff, inside the old `now - 30 * 24h` window but outside the new one
      const entryBefore30DayCutoff = entry({ earnedAmount: 120, timestamp: new Date('2026-03-11T20:00:00.000Z') })
      const entryBefore90DayCutoff = entry({ earnedAmount: 1200, timestamp: new Date('2026-01-10T20:00:00.000Z') })

      mocks.entries = [entry30DaysAgoMorning, entry90DaysAgoMorning, entryBefore30DayCutoff, entryBefore90DayCutoff]

      render(<EarnReportContent enabled />)

      expect(screen.getAllByText('balance:2070')).toHaveLength(1) // total
      expect(screen.getAllByText('balance:870')).toHaveLength(1) // 90 days
      expect(screen.getAllByText('balance:250')).toHaveLength(2) // 30 days + table row
    })
  })

  it('handles DST transitions without skipping calendar days', () => {
    withTimeZone('America/New_York', () => {
      // March 9, 2026 at 00:30 (shortly after US DST spring forward on March 8)
      const mockNow = new Date('2026-03-09T00:30:00-04:00').getTime()
      vi.spyOn(Date, 'now').mockReturnValue(mockNow)

      // 29 calendar days ago from March 9 is February 8
      // Entry on February 8 at 10:00 AM local time (-05:00 EST)
      const entryOnCutoffDay = entry({
        earnedAmount: 350,
        timestamp: new Date('2026-02-08T10:00:00-05:00'),
      })

      // February 7 is the day before the cutoff
      const entryBeforeCutoffDay = entry({
        earnedAmount: 120,
        timestamp: new Date('2026-02-07T10:00:00-05:00'),
      })

      mocks.entries = [entryOnCutoffDay, entryBeforeCutoffDay]

      render(<EarnReportContent enabled />)

      expect(screen.getAllByText('balance:470')).toHaveLength(2) // total + 90 days
      expect(screen.getAllByText('balance:350')).toHaveLength(2) // 30 days + table row
    })
  })
})
