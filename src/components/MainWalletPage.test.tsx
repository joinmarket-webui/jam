import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MainWalletPage from './MainWalletPage'

const mockState = vi.hoisted(() => ({
  isLoading: false,
  balance: 1000,
  maxFeesConfigMissing: false,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({
    toggleDisplayMode: vi.fn(),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    isLoading: mockState.isLoading,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWalletBalanceSummary: () => ({
    walletBalanceSummary: {
      calculatedTotalBalanceInSats: mockState.balance,
    },
  }),
  useJars: () => ({
    jars: [],
  }),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({
    maxFeesConfigMissing: mockState.maxFeesConfigMissing,
  }),
}))

vi.mock('./wallet/WalletJarsDetailsOverlay', () => ({
  WalletJarsDetailsOverlay: () => null,
}))

const renderMainWallet = ({
  balance = 1000,
  isLoading = false,
  maxFeesConfigMissing = false,
}: {
  balance?: number
  isLoading?: boolean
  maxFeesConfigMissing?: boolean
} = {}) => {
  mockState.balance = balance
  mockState.isLoading = isLoading
  mockState.maxFeesConfigMissing = maxFeesConfigMissing

  return render(<MainWalletPage walletFileName="test.jmdat" />)
}

describe('<MainWalletPage />', () => {
  beforeEach(() => {
    mockState.balance = 1000
    mockState.isLoading = false
    mockState.maxFeesConfigMissing = false
  })

  it('should render main wallet with journey state attribute', () => {
    renderMainWallet()

    const mainWallet = screen.getByTestId('main-wallet')

    expect(mainWallet).toBeInTheDocument()
    expect(mainWallet).toHaveAttribute('data-journey-state', 'ready')
  })

  it('should use mocked wallet and fee state predictably', () => {
    renderMainWallet({ balance: 1000, maxFeesConfigMissing: true })

    expect(screen.getByTestId('main-wallet')).toHaveAttribute('data-journey-state', 'needs_fee')
  })

  it('should return loading journey state when wallet is loading', () => {
    renderMainWallet({ isLoading: true })

    expect(screen.getByTestId('main-wallet')).toHaveAttribute('data-journey-state', 'loading')
  })

  it('should return empty journey state when wallet balance is zero', () => {
    renderMainWallet({ balance: 0 })

    expect(screen.getByTestId('main-wallet')).toHaveAttribute('data-journey-state', 'empty')
  })
})
