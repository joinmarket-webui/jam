import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import MainWalletPage from './MainWalletPage'

const navigateMock = vi.fn()
const refetch = vi.fn()
const toggleDisplayMode = vi.fn()

let walletInfo: { isLoading: boolean; isFetching: boolean; error: { message: string } | null; refetch: () => void }
let jars: Jar[]

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({ toggleDisplayMode }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => walletInfo,
  useWalletBalanceSummary: () => ({ walletBalanceSummary: { calculatedTotalBalanceInSats: 5000 } }),
  useJars: () => ({ jars }),
}))

vi.mock('./wallet/WalletJarsDetailsOverlay', () => ({
  WalletJarsDetailsOverlay: ({
    open,
    onOpenChange,
    selectedJarIndex,
  }: {
    open: boolean
    onOpenChange?: (open: boolean) => void
    selectedJarIndex?: JarIndex
  }) => (
    <div data-testid="WalletJarsDetailsOverlay">
      {open ? 'open' : 'closed'}
      <span data-testid="WalletJarsDetailsOverlay#open">{open ? 'open' : 'closed'}</span>
      <span data-testid="WalletJarsDetailsOverlay#selectedJarIndex">{selectedJarIndex ?? 'undefined'}</span>
      <button data-testid="WalletJarsDetailsOverlay#onOpenChange" onClick={() => onOpenChange?.(!open)}>
        Close
      </button>
    </div>
  ),
}))

vi.mock('./wallet/TxHistoryContent', () => ({
  TxHistoryContent: () => <div data-testid="TxHistoryContent" />,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString, onClick }: { valueString: string; onClick?: () => void }) => (
    <span onClick={onClick}>{valueString}</span>
  ),
}))

vi.mock('./ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}))

const walletFileName = 'wallet.jmdat' as WalletFileName

const makeJar = (jarIndex: number, name: string): Jar =>
  ({
    jarIndex,
    name,
    color: '#000',
    balanceSummary: {
      calculatedTotalBalanceInSats: 100,
      calculatedAvailableBalanceInSats: 100,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedAvailableFrozenBalanceInSats: 0,
    },
  }) as unknown as Jar

describe('MainWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletInfo = { isLoading: false, isFetching: false, error: null, refetch }
    jars = [makeJar(0, 'Jar 0'), makeJar(1, 'Jar 1')]
  })

  it('shows a loading spinner while loading', () => {
    walletInfo = { ...walletInfo, isLoading: true }
    render(<MainWalletPage walletFileName={walletFileName} />)
    expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0)
  })

  it('renders balance and jars, and opens the jar overlay on click', () => {
    render(<MainWalletPage walletFileName={walletFileName} />)
    expect(screen.getByText('5000')).toBeInTheDocument()
    expect(screen.getByTestId('WalletJarsDetailsOverlay#open')).toHaveTextContent('closed')
    expect(screen.getByTestId('WalletJarsDetailsOverlay#selectedJarIndex')).toHaveTextContent('undefined')

    fireEvent.click(screen.getByText(jars[0].name))
    expect(screen.getByTestId('WalletJarsDetailsOverlay#open')).toHaveTextContent('open')
    expect(screen.getByTestId('WalletJarsDetailsOverlay#selectedJarIndex')).toHaveTextContent(String(jars[0].jarIndex))

    fireEvent.click(screen.getByTestId('WalletJarsDetailsOverlay#onOpenChange'))
    expect(screen.getByTestId('WalletJarsDetailsOverlay#open')).toHaveTextContent('closed')
    expect(screen.getByTestId('WalletJarsDetailsOverlay#selectedJarIndex')).toHaveTextContent('undefined')

    fireEvent.click(screen.getByTestId('WalletJarsDetailsOverlay#onOpenChange'))
    expect(screen.getByTestId('WalletJarsDetailsOverlay#open')).toHaveTextContent('open')
    expect(screen.getByTestId('WalletJarsDetailsOverlay#selectedJarIndex')).toHaveTextContent('undefined')
  })

  it('navigates to deposit and withdraw routes', () => {
    render(<MainWalletPage walletFileName={walletFileName} />)
    fireEvent.click(screen.getByText('current_wallet.button_deposit'))
    fireEvent.click(screen.getByText('current_wallet.button_withdraw'))
    expect(navigateMock).toHaveBeenCalledTimes(2)
  })

  it('shows an error alert with a retry button', () => {
    walletInfo = { ...walletInfo, error: { message: 'load failed' } }
    render(<MainWalletPage walletFileName={walletFileName} />)
    expect(screen.getByText(/error_loading_wallet_failed/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('global.retry'))
    expect(refetch).toHaveBeenCalled()
  })

  it('keeps jars visible and clickable while fetching in the background', () => {
    walletInfo = { ...walletInfo, isFetching: true }
    render(<MainWalletPage walletFileName={walletFileName} />)
    expect(screen.getByText(jars[0].name)).toBeInTheDocument()

    fireEvent.click(screen.getByText(jars[0].name))
    expect(screen.getByTestId('WalletJarsDetailsOverlay#open')).toHaveTextContent('open')
    expect(screen.getByTestId('WalletJarsDetailsOverlay#selectedJarIndex')).toHaveTextContent(String(jars[0].jarIndex))
    fireEvent.click(screen.getByText('global.refresh'))
    expect(refetch).toHaveBeenCalled()
  })

  it('toggles display mode when clicking the balance', () => {
    render(<MainWalletPage walletFileName={walletFileName} />)
    fireEvent.click(screen.getByText('5000'))
    expect(toggleDisplayMode).toHaveBeenCalled()
  })
})
