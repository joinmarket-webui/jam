import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EarnReportContent } from './EarnReportContent'
import type { EarnReportEntry } from './hooks/useQueryYieldgenReport'

const mocks = vi.hoisted(() => ({
  createObjectURL: vi.fn<(blob: Blob) => string>(() => 'blob:earn-report'),
  developerMode: false,
  entries: [] as EarnReportEntry[],
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
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: mocks.createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: mocks.revokeObjectURL,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
      // eslint-disable-next-line unicorn/prefer-https -- XHTML namespace URI is an identifier that must be http
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

  it('adds demo rows in developer mode', () => {
    mocks.developerMode = true

    render(<EarnReportContent enabled />)

    expect(screen.getByText('dev-badge')).toBeInTheDocument()
    expect(screen.getByText('earn.report.text_report_summary:{"count":3}')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /earn\.report\.text_button_generate_demo_report/u }))

    expect(screen.getByText('earn.report.text_report_summary:{"count":4}')).toBeInTheDocument()
  })
})
