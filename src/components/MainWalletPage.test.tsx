import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import MainWalletPage from './MainWalletPage'

type MockBalanceSummary = {
  calculatedTotalBalanceInSats: number
  calculatedAvailableBalanceInSats: number
  calculatedFrozenOrLockedBalanceInSats: number
}

type MockJar = {
  jarIndex: number
  name: string
  color: string
  balanceSummary: MockBalanceSummary
  utxos: Array<{ confirmations: number }>
}

type MockWalletInfoContext = {
  walletName: string | null
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<unknown>
}

const noopNavigate = () => undefined

const createWalletBalanceSummary = (totalBalance: number): MockBalanceSummary => ({
  calculatedTotalBalanceInSats: totalBalance,
  calculatedAvailableBalanceInSats: totalBalance,
  calculatedFrozenOrLockedBalanceInSats: 0,
})

const createJar = (confirmations: number[]): MockJar => ({
  jarIndex: 0,
  name: 'Apricot',
  color: '#e2b86a',
  balanceSummary: createWalletBalanceSummary(0),
  utxos: confirmations.map((value) => ({ confirmations: value })),
})

const testState = vi.hoisted(() => ({
  jamDisplayContext: {
    toggleDisplayMode: vi.fn(),
  },
  walletInfo: {
    walletName: 'Satoshi',
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: async () => await Promise.resolve(undefined),
  } as MockWalletInfoContext,
  walletBalanceSummary: {
    calculatedTotalBalanceInSats: 100_000,
    calculatedAvailableBalanceInSats: 100_000,
    calculatedFrozenOrLockedBalanceInSats: 0,
  } as MockBalanceSummary,
  jars: [
    {
      jarIndex: 0,
      name: 'Apricot',
      color: '#e2b86a',
      balanceSummary: {
        calculatedTotalBalanceInSats: 0,
        calculatedAvailableBalanceInSats: 0,
        calculatedFrozenOrLockedBalanceInSats: 0,
      },
      utxos: [{ confirmations: 6 }],
    } as MockJar,
  ],
  jmInfo: {
    version: undefined,
    queryResult: {
      isLoading: false,
      isError: false,
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => noopNavigate,
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => testState.jamDisplayContext,
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => testState.walletInfo,
  useWalletBalanceSummary: () => ({
    walletBalanceSummary: testState.walletBalanceSummary,
    isLoading: false,
  }),
  useJars: () => ({
    jars: testState.jars,
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useQueryJmInfo', () => ({
  useQueryJmInfo: () => testState.jmInfo,
}))

vi.mock('./ui/jam/Balance', () => ({
  Balance: () => <div data-testid="mock-balance">balance</div>,
}))

vi.mock('@/components/ui/jam/ClickableJar', () => ({
  ClickableJar: () => <div data-testid="mock-jar">jar</div>,
}))

vi.mock('./wallet/WalletJarsDetailsOverlay', () => ({
  WalletJarsDetailsOverlay: () => null,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const DEFAULT_WALLET_FILE_NAME = 'Satoshi.jmdat' as WalletFileName

const resetMocks = () => {
  testState.jamDisplayContext = {
    toggleDisplayMode: vi.fn(),
  }
  testState.walletInfo = {
    walletName: 'Satoshi',
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: async () => await Promise.resolve(undefined),
  }
  testState.walletBalanceSummary = createWalletBalanceSummary(100_000)
  testState.jars = [createJar([6])]
  testState.jmInfo = {
    version: undefined,
    queryResult: {
      isLoading: false,
      isError: false,
    },
  }
}

const renderMainWalletPage = () => {
  return render(<MainWalletPage walletFileName={DEFAULT_WALLET_FILE_NAME} />)
}

const getJourneyState = (container: HTMLElement) => {
  const journeyElement = container.querySelector('[data-journey-state]')
  expect(journeyElement).not.toBeNull()
  return (journeyElement as HTMLElement).dataset.journeyState
}

describe('<MainWalletPage /> journey state', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('should set loading when wallet data is loading', () => {
    testState.walletInfo = {
      ...testState.walletInfo,
      isLoading: true,
    }

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('loading')
  })

  it('should set no-wallet when wallet name is unavailable', () => {
    testState.walletInfo = {
      ...testState.walletInfo,
      walletName: null,
    }

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('no-wallet')
  })

  it('should set service-offline when JoinMarket service query fails', () => {
    testState.jmInfo = {
      version: undefined,
      queryResult: {
        isLoading: false,
        isError: true,
      },
    }

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('service-offline')
  })

  it('should set action-required when wallet query has an error', () => {
    testState.walletInfo = {
      ...testState.walletInfo,
      error: new Error('wallet load failed'),
    }

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('action-required')
  })

  it('should set empty-wallet when balance is zero', () => {
    testState.walletBalanceSummary = createWalletBalanceSummary(0)
    testState.jars = [createJar([6])]

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('empty-wallet')
  })

  it('should set awaiting-confirmation when wallet is funded but all funds are below confirmation threshold', () => {
    testState.walletBalanceSummary = {
      calculatedTotalBalanceInSats: 100_000,
      calculatedAvailableBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 100_000,
    }
    testState.jars = [createJar([1])]

    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('awaiting-confirmation')
  })

  it('should set ready when wallet is funded and confirmations are available', () => {
    const { container } = renderMainWalletPage()

    expect(getJourneyState(container)).toBe('ready')
  })
})
