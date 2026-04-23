import { render, screen } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import MainWalletView from './MainWalletView'
import { useStore } from 'zustand'
import { useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { BalanceSummary } from '@/lib/balanceSummary'

vi.mock('zustand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand')>()
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

const createWalletBalanceSummary = (calculatedTotalBalanceInSats: number): ReturnType<typeof useWalletBalanceSummary> => {
  const walletBalanceSummary: BalanceSummary = {
    calculatedTotalBalanceInSats,
    calculatedAvailableBalanceInSats: calculatedTotalBalanceInSats,
    calculatedFrozenOrLockedBalanceInSats: 0,
  }
  return { walletBalanceSummary, isLoading: false }
}

const createFeeConfigValidationResult = (maxFeesConfigMissing: boolean): ReturnType<typeof useFeeConfigValidation> => ({
  feeConfigValues: {},
  maxFeesConfigMissing,
  refetchAll: vi.fn(() => Promise.resolve([])),
  fetchMissing: vi.fn(() => Promise.resolve([])),
  isLoading: false,
})

const setSession = (session?: SessionResponse) => {
  vi.mocked(useStore).mockReturnValue(session)
}

describe('MainWalletView', () => {
  const setup = () => {
    return render(
      <MemoryRouter>
        <MainWalletView walletFileName="test.jmdat" />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have data-journey-state="syncing" when rescanning', () => {
    setSession({ rescanning: true } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(1000))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(false))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'syncing')
  })

  it('should have data-journey-state="empty" when balance is 0', () => {
    setSession({ rescanning: false } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(0))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(false))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'empty')
  })

  it('should have data-journey-state="fee-config-missing" when fee config is missing', () => {
    setSession({ rescanning: false } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(1000))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(true))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'fee-config-missing')
  })

  it('should have data-journey-state="coinjoining" when coinjoin is active', () => {
    setSession({ rescanning: false, coinjoin_in_process: true } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(1000))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(false))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'coinjoining')
  })

  it('should have data-journey-state="making" when maker is running', () => {
    setSession({ rescanning: false, maker_running: true } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(1000))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(false))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'making')
  })

  it('should have data-journey-state="idle" by default', () => {
    setSession({ rescanning: false } as SessionResponse)
    vi.mocked(useWalletBalanceSummary).mockReturnValue(createWalletBalanceSummary(1000))
    vi.mocked(useFeeConfigValidation).mockReturnValue(createFeeConfigValidationResult(false))

    setup()
    expect(screen.getByTestId('main-wallet-view')).toHaveAttribute('data-journey-state', 'idle')
  })
})
