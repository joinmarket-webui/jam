import type { WalletHistoryResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFetchFullWalletHistory, useQueryWalletHistory } from '@/hooks/useQueryWalletHistory'
import { TxHistoryContent } from './TxHistoryContent'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/useQueryWalletHistory', () => ({
  useQueryWalletHistory: vi.fn(),
  useFetchFullWalletHistory: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('./TxHistoryTable', () => ({
  TxHistoryTable: ({ history, compact }: { history: unknown[]; compact: boolean }) => (
    <div data-testid="mock-table" data-compact={compact}>
      Mock Table (Rows: {history.length})
    </div>
  ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div data-testid="mock-alert" data-variant={variant}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="mock-loading" />,
}))

const mockUseQuery = useQueryWalletHistory as unknown as ReturnType<typeof vi.fn>
const mockUseFetchFullHistory = useFetchFullWalletHistory as unknown as ReturnType<typeof vi.fn>

const historyEntry = (index: number) => ({
  timestamp: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00`,
  txid: `txid_${index + 1}`,
  role: 'deposit' as const,
  amount: 1000 * (index + 1),
  net_fee: 0,
  confirmations: 6,
})

const mockQueryResult = (overrides: Partial<UseQueryResult<WalletHistoryResponse, unknown>>) =>
  ({
    isLoading: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  }) as UseQueryResult<WalletHistoryResponse, unknown>

describe('TxHistoryContent', () => {
  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({
      history: [],
      queryResult: mockQueryResult({ isLoading: true }),
    })

    render(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)
    expect(screen.getByTestId('mock-loading')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      history: [],
      queryResult: mockQueryResult({ error: new Error('failed') }),
    })

    render(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)
    expect(screen.getByTestId('mock-alert')).toBeInTheDocument()
    expect(screen.getByText('tx_history.error_loading')).toBeInTheDocument()
  })

  it('renders the table with data', () => {
    const mockHistory = [{ txid: '1' }, { txid: '2' }]
    mockUseQuery.mockReturnValue({
      history: mockHistory,
      queryResult: mockQueryResult({}),
    })

    render(<TxHistoryContent walletFileName="wallet.jmdat" compact={true} />)
    expect(screen.getByTestId('mock-table')).toHaveAttribute('data-compact', 'true')
    expect(screen.getByText('Mock Table (Rows: 2)')).toBeInTheDocument()
  })

  it('renders Load More button when not compact and handles clicks', () => {
    const mockHistory = Array.from({ length: 10 }, () => ({ txid: 'mock' }))
    const refetch = vi.fn()

    mockUseQuery.mockReturnValue({
      history: mockHistory,
      queryResult: mockQueryResult({ refetch, isFetching: false }),
    })

    render(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)

    const loadMoreButton = screen.getByRole('button', { name: 'tx_history.button_load_more' })
    expect(loadMoreButton).toBeInTheDocument()

    fireEvent.click(loadMoreButton)
    expect(mockUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 20 }))
  })

  it('hides Load More button if history length is less than limit', () => {
    const mockHistory = Array.from({ length: 5 }, () => ({ txid: 'mock' }))

    mockUseQuery.mockReturnValue({
      history: mockHistory,
      queryResult: mockQueryResult({}),
    })

    render(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)
    expect(screen.queryByRole('button', { name: 'tx_history.button_load_more' })).not.toBeInTheDocument()
  })

  describe('CSV export', () => {
    const fetchFullHistory = vi.fn()

    beforeEach(() => {
      fetchFullHistory.mockReset()
      mockUseFetchFullHistory.mockReturnValue(fetchFullHistory)
    })

    const mockDownload = () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob')
      const revokeObjectURL = vi.fn()
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL

      const clickSpy = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName)
        if (tagName === 'a') {
          element.click = clickSpy
        }
        return element
      })

      return { createObjectURL, clickSpy }
    }

    it('disables download button when history is empty or loading', () => {
      mockUseQuery.mockReturnValue({
        history: [],
        queryResult: mockQueryResult({ isLoading: true }),
      })

      const { rerender } = render(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)
      expect(screen.getByRole('button', { name: 'global.download' })).toBeDisabled()

      mockUseQuery.mockReturnValue({
        history: [],
        queryResult: mockQueryResult({ isLoading: false }),
      })
      rerender(<TxHistoryContent walletFileName="wallet.jmdat" compact={false} />)

      const downloadButton = screen.getByRole('button', { name: 'global.download' })
      expect(downloadButton).toBeDisabled()
    })

    it('downloads CSV file when download button is clicked', async () => {
      const mockHistory = [
        {
          timestamp: '2026-11-01T10:00:00.000Z',
          txid: 'test_txid',
          role: 'send' as const,
          amount: 75000,
          net_fee: -300,
          confirmations: 6,
        },
      ]

      mockUseQuery.mockReturnValue({
        history: mockHistory,
        queryResult: mockQueryResult({ isLoading: false }),
      })
      fetchFullHistory.mockResolvedValue(mockHistory)

      const { createObjectURL, clickSpy } = mockDownload()

      render(<TxHistoryContent walletFileName="test_wallet.jmdat" compact={false} />)

      const downloadButton = screen.getByRole('button', { name: 'global.download' })
      expect(downloadButton).toBeEnabled()

      fireEvent.click(downloadButton)

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
      const downloadBlob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined
      expect(downloadBlob).toBeInstanceOf(Blob)
      const text = await (downloadBlob as Blob).text()
      expect(text).toContain('timestamp,txid,role,amount,net_fee,confirmations')
      expect(text).toContain('2026-11-01T10:00:00.000Z,test_txid,send,75000,-300,6')

      expect(clickSpy).toHaveBeenCalledTimes(1)

      vi.restoreAllMocks()
    })

    it('exports the full history, not only the rows loaded for display', async () => {
      const fullHistory = Array.from({ length: 7 }, (_, index) => historyEntry(6 - index))

      mockUseQuery.mockReturnValue({
        history: fullHistory.slice(0, 5),
        queryResult: mockQueryResult({ isLoading: false }),
      })
      fetchFullHistory.mockResolvedValue(fullHistory)

      const { createObjectURL } = mockDownload()

      render(<TxHistoryContent walletFileName="test_wallet.jmdat" compact={true} initialLimit={5} />)

      expect(screen.getByText('Mock Table (Rows: 5)')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'global.download' }))

      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
      expect(fetchFullHistory).toHaveBeenCalledTimes(1)

      const downloadBlob = createObjectURL.mock.calls[0]?.[0] as Blob
      const csv = await downloadBlob.text()
      const lines = csv.split('\n')

      expect(lines).toHaveLength(8)
      expect(lines[1]).toContain('txid_7')
      expect(lines.at(-1)).toContain('txid_1')

      vi.restoreAllMocks()
    })

    it('shows an error and downloads nothing when fetching the full history fails', async () => {
      mockUseQuery.mockReturnValue({
        history: [{ txid: 'test_txid' }],
        queryResult: mockQueryResult({ isLoading: false }),
      })
      fetchFullHistory.mockRejectedValue(new Error('failed'))

      const { createObjectURL, clickSpy } = mockDownload()

      render(<TxHistoryContent walletFileName="test_wallet.jmdat" compact={false} />)

      fireEvent.click(screen.getByRole('button', { name: 'global.download' }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('tx_history.error_loading'))
      expect(createObjectURL).not.toHaveBeenCalled()
      expect(clickSpy).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })
})
