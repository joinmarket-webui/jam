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

  it('renders loading and empty report states', () => {
    mocks.isLoading = true
    const { rerender } = render(<EarnReportContent enabled />)

    expect(screen.getByText('spinner')).toBeInTheDocument()

    mocks.isLoading = false
    mocks.entries = []
    rerender(<EarnReportContent enabled />)

    expect(screen.getByText('earn.alert_empty_report')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /earn\.report\.text_button_download_csv/u })).toBeDisabled()
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
    expect(screen.getByText(/earn\.report\.text_report_summary:\{"count":3\}/u)).toBeInTheDocument()
    expect(screen.getByText('first maker note')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('earn.report.placeholder_search'), {
      target: { value: 'second' },
    })
    expect(screen.getByText(/earn\.report\.text_report_summary_filtered/u)).toBeInTheDocument()
    expect(screen.queryByText('first maker note')).not.toBeInTheDocument()
    expect(screen.getByText('second maker note')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /earn\.report\.text_button_download_csv/u }))
    expect(mocks.createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'first-page' }))
    fireEvent.click(screen.getByRole('button', { name: 'show-all' }))
    fireEvent.click(screen.getByRole('button', { name: 'show-page-size' }))
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled())
    createElement.mockRestore()
  })

  it('adds demo rows in developer mode', () => {
    mocks.developerMode = true

    render(<EarnReportContent enabled />)

    fireEvent.click(screen.getByRole('button', { name: /earn\.report\.text_button_generate_demo_report/u }))

    expect(screen.getByText('dev-badge')).toBeInTheDocument()
    expect(screen.getByText(/earn\.report\.text_report_summary:\{"count":4\}/u)).toBeInTheDocument()
  })
})
