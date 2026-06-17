import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DevPage from './DevPage'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand')>()
  return {
    ...actual,
    useStore: () => ({ some: 'state' }),
  }
})

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({
    feeConfigValues: {},
    isLoading: false,
    maxFeesConfigMissing: false,
    refetchAll: vi.fn(),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJars: () => [],
  useWalletBalanceSummary: () => ({}),
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: () => <div data-testid="fee-config-dialog" />,
}))

vi.mock('./FeeConfigTestComponent', () => ({
  FeeConfigTestComponent: () => <div data-testid="fee-config-test" />,
}))

describe('DevPage', () => {
  it('renders correctly', () => {
    render(<DevPage walletFileName="test.jmdat" />)

    expect(screen.getByText('Development specific information')).toBeInTheDocument()
    expect(screen.getAllByText('Config')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Wallet')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Links')[0]).toBeInTheDocument()
  })

  it('renders tabs', () => {
    render(<DevPage walletFileName="test.jmdat" />)

    // Check Config tab
    expect(screen.getByText(/import\.meta\.env/)).toBeInTheDocument()

    // Check FeeConfig validations
    expect(screen.getByTestId('fee-config-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('fee-config-test')).toBeInTheDocument()
  })
})
