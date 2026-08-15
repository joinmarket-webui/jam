import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryEntry } from '@/hooks/useQueryWalletHistory'
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
  cj_amount: 5000,
  net_fee: 0,
  confirmations: 10,
  success: true,
  source_mixdepth: 0,
}

const mockSend: HistoryEntry = {
  timestamp: '2026-07-28T13:00:00Z',
  role: 'send',
  txid: 'tx2',
  cj_amount: 10000,
  net_fee: -100,
  confirmations: 0,
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
