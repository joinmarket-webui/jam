import type { WalletHistoryResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useQueryWalletHistory } from '@/hooks/useQueryWalletHistory'
import { TxHistoryContent } from './TxHistoryContent'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/hooks/useQueryWalletHistory', () => ({
  useQueryWalletHistory: vi.fn(),
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

      const createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob')
      const revokeObjectURL = vi.fn()
      globalThis.URL.createObjectURL = createObjectURL
      globalThis.URL.revokeObjectURL = revokeObjectURL

      const clickSpy = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName)
        if (tagName === 'a') {
          element.click = clickSpy
        }
        return element
      })

      render(<TxHistoryContent walletFileName="test_wallet.jmdat" compact={false} />)

      const downloadButton = screen.getByRole('button', { name: 'global.download' })
      expect(downloadButton).toBeEnabled()

      fireEvent.click(downloadButton)

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const downloadBlob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined
      expect(downloadBlob).toBeInstanceOf(Blob)
      const text = await (downloadBlob as Blob).text()
      expect(text).toContain('timestamp,txid,role,amount,net_fee,confirmations')
      expect(text).toContain('2026-11-01T10:00:00.000Z,test_txid,send,75000,-300,6')

      expect(clickSpy).toHaveBeenCalledTimes(1)

      vi.restoreAllMocks()
    })
  })
})
