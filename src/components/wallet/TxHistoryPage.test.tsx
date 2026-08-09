import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TxHistoryPage } from './TxHistoryPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./TxHistoryContent', () => ({
  TxHistoryContent: ({ compact }: { compact: boolean }) => (
    <div data-testid="tx-history-content" data-compact={compact} />
  ),
}))

describe('TxHistoryPage', () => {
  it('renders TxHistoryContent in non-compact page mode with title', () => {
    render(<TxHistoryPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('tx_history.title')).toBeInTheDocument()
    const content = screen.getByTestId('tx-history-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-compact', 'false')
  })
})
