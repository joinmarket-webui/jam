import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'
import { withTimeZone } from '@/test/withTimeZone'
import { TxHistoryTable } from './TxHistoryTable'

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

const mockDeposit: HistoryEntry = {
  timestamp: '2026-07-28T12:00:00Z',
  role: 'deposit',
  txid: 'tx1',
  amount: 5000,
  cj_amount: null,
  net_fee: 0,
  confirmations: 10,
  success: true,
  source_mixdepth: 0,
}

const mockSend: HistoryEntry = {
  timestamp: '2026-07-28T13:00:00Z',
  role: 'send',
  txid: 'tx2',
  amount: 10000,
  cj_amount: null,
  net_fee: -100,
  confirmations: 0,
  success: true,
  source_mixdepth: 0,
}

const mockTaker: HistoryEntry = {
  timestamp: '2026-07-28T15:00:00Z',
  role: 'taker',
  txid: 'tx4',
  amount: 20000,
  cj_amount: 20000,
  net_fee: -300,
  confirmations: 2,
  success: true,
  source_mixdepth: 0,
}

const mockFailed: HistoryEntry = {
  timestamp: '2026-07-28T14:00:00Z',
  role: 'taker',
  txid: 'tx3',
  cj_amount: 0,
  net_fee: 0,
  confirmations: 0,
  success: false,
  failure_reason: 'aborted',
  source_mixdepth: 1,
}

describe('TxHistoryTable', () => {
  beforeEach(() => {
    mocks.toastSuccess.mockReset()
    mocks.toastError.mockReset()
  })

  it('renders history rows and sorts by date', () => {
    render(<TxHistoryTable history={[mockDeposit, mockSend]} />)

    expect(screen.getByText('tx_history.label_role_deposit')).toBeInTheDocument()
    expect(screen.getByText('tx_history.label_role_send')).toBeInTheDocument()

    const dateHeader = screen.getByText('tx_history.column_title_date')
    fireEvent.click(dateHeader)
    expect(dateHeader).toBeInTheDocument()
  })

  it('displays timestamps without a time zone designator as UTC', () => {
    withTimeZone('America/New_York', () => {
      render(<TxHistoryTable history={[{ ...mockDeposit, timestamp: '2026-07-28T12:00:00.123456' }]} />)

      expect(screen.getByText(new Date(Date.UTC(2026, 6, 28, 12, 0, 0, 123)).toLocaleString())).toBeInTheDocument()
    })
  })

  it('respects the time zone designator of timestamps', () => {
    withTimeZone('America/New_York', () => {
      render(<TxHistoryTable history={[{ ...mockDeposit, timestamp: '2026-07-28T17:30:00+05:30' }]} />)

      expect(screen.getByText(new Date(Date.UTC(2026, 6, 28, 12, 0, 0)).toLocaleString())).toBeInTheDocument()
    })
  })

  it('displays the amount of direct sends and deposits', () => {
    render(<TxHistoryTable history={[mockDeposit, mockSend, mockTaker]} />)

    expect(screen.getByText('5000')).toBeInTheDocument()
    expect(screen.getByText('10000')).toBeInTheDocument()
    expect(screen.getByText('20000')).toBeInTheDocument()
  })

  it('sorts by the amount of all roles', () => {
    render(<TxHistoryTable history={[mockDeposit, mockTaker, mockSend]} />)

    fireEvent.click(screen.getByText('tx_history.column_title_amount'))

    const txids = screen.getAllByText(/^tx\d$/).map((it) => it.textContent)
    expect(txids).toEqual(['tx4', 'tx2', 'tx1'])
  })

  it('renders empty history alert', () => {
    render(<TxHistoryTable history={[]} />)
    expect(screen.getByText('tx_history.empty_history')).toBeInTheDocument()
  })

  it('expands row details to show raw JSON', () => {
    render(<TxHistoryTable history={[mockDeposit]} />)

    const detailsButton = screen.getByRole('button', { name: 'jar_details.utxo_list.row_button_details' })
    fireEvent.click(detailsButton)

    // Check if the JSON is rendered
    expect(screen.getByText(/"txid": "tx1"/u)).toBeInTheDocument()
  })

  it('sorts columns correctly', () => {
    render(<TxHistoryTable history={[mockDeposit, mockSend, mockFailed]} />)

    fireEvent.click(screen.getByText('tx_history.column_title_amount'))
    fireEvent.click(screen.getByText('tx_history.column_title_net_fee'))
    fireEvent.click(screen.getByText('tx_history.column_title_confirmations'))
    fireEvent.click(screen.getByText('tx_history.column_title_role'))

    expect(screen.getByText('tx_history.label_role_taker')).toBeInTheDocument()
  })
})
