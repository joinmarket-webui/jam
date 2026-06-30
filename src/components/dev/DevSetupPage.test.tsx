import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DevSetupPage from './DevSetupPage'

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title, subtitle }: { title: React.ReactNode; subtitle: string }) => (
    <div data-testid="page-title">
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  ),
}))

vi.mock('./DevBadge', () => ({
  DevBadge: () => <span data-testid="dev-badge">dev-badge</span>,
}))

describe('DevSetupPage', () => {
  it('renders development setup information', () => {
    render(<DevSetupPage />)

    expect(screen.getByTestId('page-title')).toBeInTheDocument()
    expect(screen.getByTestId('dev-badge')).toBeInTheDocument()

    // Check some specific content
    expect(screen.getByText('Test Wallet')).toBeInTheDocument()
    expect(screen.getByText('Satoshi')).toBeInTheDocument()

    expect(screen.getByText('Jam Instances')).toBeInTheDocument()
    expect(screen.getByText(/jm_regtest_joinmarket2/i)).toBeInTheDocument()
    expect(screen.getByText(/jm_regtest_joinmarket3/i)).toBeInTheDocument()

    expect(screen.getByText('Block Explorer')).toBeInTheDocument()
    expect(screen.getByText(/jm_regtest_explorer/i)).toBeInTheDocument()
    expect(screen.getByText(/Regtest RPC Terminal/i)).toBeInTheDocument()
  })
})
