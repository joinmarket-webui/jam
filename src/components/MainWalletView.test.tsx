import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MainWalletView from './MainWalletView'
import { useStore } from 'zustand'
import { useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'

vi.mock('zustand', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    useStore: vi.fn(),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({
    toggleDisplayMode: vi.fn(),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWalletBalanceSummary: vi.fn(),
  useJars: () => ({
    jars: [],
  }),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts', () => ({
  createClient: vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
      error: { use: vi.fn() },
    },
  })),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/jm', () => ({
  token: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  lockwalletOptions: vi.fn(),
}))

describe('MainWalletView', () => {
  const setup = () => {
    return render(
      <MemoryRouter>
        <MainWalletView walletFileName="test.jmdat" />
      </MemoryRouter>
    )
  }

  it('should have data-journey-state="syncing" when rescanning', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: true })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 1000 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: false } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'syncing')
  })

  it('should have data-journey-state="empty" when balance is 0', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: false })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 0 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: false } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'empty')
  })

  it('should have data-journey-state="fee-config-missing" when fee config is missing', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: false })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 1000 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: true } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'fee-config-missing')
  })

  it('should have data-journey-state="coinjoining" when coinjoin is active', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: false, coinjoin_in_process: true })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 1000 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: false } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'coinjoining')
  })

  it('should have data-journey-state="making" when maker is running', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: false, maker_running: true })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 1000 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: false } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'making')
  })

  it('should have data-journey-state="idle" by default', () => {
    vi.mocked(useStore).mockReturnValue({ rescanning: false })
    vi.mocked(useWalletBalanceSummary).mockReturnValue({
      walletBalanceSummary: { calculatedTotalBalanceInSats: 1000 },
    } as any)
    vi.mocked(useFeeConfigValidation).mockReturnValue({ maxFeesConfigMissing: false } as any)

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'idle')
  })
})
