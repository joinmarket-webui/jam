import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MainWalletPage from '@/components/MainWalletPage'

type WalletContextMock = {
    walletName: string | null
    isLoading: boolean
    isFetching: boolean
    error: Error | null
    walletBalanceSummary: {
        calculatedTotalBalanceInSats: number
        calculatedAvailableBalanceInSats: number
        calculatedFrozenOrLockedBalanceInSats: number
    }
}

type ServiceInfoContextMock =
    | {
        maker_running?: boolean
        coinjoin_in_process?: boolean
        schedule?: unknown[]
    }
    | undefined

const walletContextMock: WalletContextMock = {
    walletName: 'Test Wallet',
    isLoading: false,
    isFetching: false,
    error: null,
    walletBalanceSummary: {
        calculatedTotalBalanceInSats: 100_000,
        calculatedAvailableBalanceInSats: 100_000,
        calculatedFrozenOrLockedBalanceInSats: 0,
    },
}

let serviceInfoContextMock: ServiceInfoContextMock = undefined

const setWalletContextMock = (overrides: Partial<WalletContextMock> = {}) => {
    Object.assign(walletContextMock, overrides)
}

const setServiceInfoContextMock = (value: ServiceInfoContextMock) => {
    serviceInfoContextMock = value
}

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}))

vi.mock('zustand', async (importOriginal) => {
    const actual = await importOriginal<typeof import('zustand')>()
    return {
        ...actual,
        useStore: (_store: unknown, selector: (state: { state: ServiceInfoContextMock }) => unknown) => {
            return selector({ state: serviceInfoContextMock })
        },
    }
})

vi.mock('@/context/JamDisplayContext', () => ({
    useJamDisplayContext: () => ({ toggleDisplayMode: vi.fn() }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
    useJamWalletInfoContext: () => ({
        walletName: walletContextMock.walletName,
        isLoading: walletContextMock.isLoading,
        isFetching: walletContextMock.isFetching,
        error: walletContextMock.error,
        refetch: vi.fn(),
        walletBalanceSummary: walletContextMock.walletBalanceSummary,
    }),
    useWalletBalanceSummary: () => ({
        walletBalanceSummary: walletContextMock.walletBalanceSummary,
        isLoading: walletContextMock.isLoading,
    }),
    useJars: () => ({ jars: [], isLoading: false }),
}))

vi.mock('@/components/wallet/WalletJarsDetailsOverlay', () => ({
    WalletJarsDetailsOverlay: () => null,
}))

describe('<MainWalletPage /> journey state', () => {
    beforeEach(() => {
        setWalletContextMock({
            walletName: 'Test Wallet',
            isLoading: false,
            isFetching: false,
            error: null,
            walletBalanceSummary: {
                calculatedTotalBalanceInSats: 100_000,
                calculatedAvailableBalanceInSats: 100_000,
                calculatedFrozenOrLockedBalanceInSats: 0,
            },
        })
        setServiceInfoContextMock(undefined)
    })

    it('sets data-journey-state to no_wallet_or_not_initialized when service is unavailable', () => {
        setServiceInfoContextMock(undefined)

        const { container } = render(<MainWalletPage walletFileName={'wallet.jmdat'} />)
        const journeyContainer = container.querySelector('[data-journey-state]')

        expect(journeyContainer).toHaveAttribute('data-journey-state', 'no_wallet_or_not_initialized')
    })

    it('sets data-journey-state to coinjoin_in_progress when coinjoin is active', () => {
        setServiceInfoContextMock({
            maker_running: false,
            coinjoin_in_process: true,
            schedule: [],
        })

        const { container } = render(<MainWalletPage walletFileName={'wallet.jmdat'} />)
        const journeyContainer = container.querySelector('[data-journey-state]')

        expect(journeyContainer).toHaveAttribute('data-journey-state', 'coinjoin_in_progress')
    })

    it('sets data-journey-state to empty_wallet when balance is zero', () => {
        setWalletContextMock({
            walletBalanceSummary: {
                calculatedTotalBalanceInSats: 0,
                calculatedAvailableBalanceInSats: 0,
                calculatedFrozenOrLockedBalanceInSats: 0,
            },
        })
        setServiceInfoContextMock({
            maker_running: false,
            coinjoin_in_process: false,
            schedule: [],
        })

        const { container } = render(<MainWalletPage walletFileName={'wallet.jmdat'} />)
        const journeyContainer = container.querySelector('[data-journey-state]')

        expect(journeyContainer).toHaveAttribute('data-journey-state', 'empty_wallet')
    })

    it('sets data-journey-state to ready_for_coinjoin when service is available and funds are spendable', () => {
        setWalletContextMock({
            walletBalanceSummary: {
                calculatedTotalBalanceInSats: 250_000,
                calculatedAvailableBalanceInSats: 250_000,
                calculatedFrozenOrLockedBalanceInSats: 0,
            },
        })
        setServiceInfoContextMock({
            maker_running: false,
            coinjoin_in_process: false,
            schedule: [],
        })

        const { container } = render(<MainWalletPage walletFileName={'wallet.jmdat'} />)
        const journeyContainer = container.querySelector('[data-journey-state]')

        expect(journeyContainer).toHaveAttribute('data-journey-state', 'ready_for_coinjoin')
    })

    it('sets data-journey-state to funded_not_ready when maker is running', () => {
        setWalletContextMock({
            walletBalanceSummary: {
                calculatedTotalBalanceInSats: 250_000,
                calculatedAvailableBalanceInSats: 250_000,
                calculatedFrozenOrLockedBalanceInSats: 0,
            },
        })
        setServiceInfoContextMock({
            maker_running: true,
            coinjoin_in_process: false,
            schedule: [],
        })

        const { container } = render(<MainWalletPage walletFileName={'wallet.jmdat'} />)
        const journeyContainer = container.querySelector('[data-journey-state]')

        expect(journeyContainer).toHaveAttribute('data-journey-state', 'funded_not_ready')
    })
})
