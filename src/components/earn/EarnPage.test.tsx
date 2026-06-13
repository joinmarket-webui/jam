import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { EarnFormValues } from './EarnForm'
import { EarnPage } from './EarnPage'

const mocks = vi.hoisted(() => ({
  developerMode: false,
  feeConfigMissing: false,
  scrollToTop: vi.fn(),
  startMaker: vi.fn(),
  startMutationState: {
    isPending: false,
    isSuccess: false,
  },
  stopMakerRefetch: vi.fn(),
  stopMutationState: {
    isPending: false,
    isSuccess: false,
  },
  toastDismiss: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  walletInfo: {
    fidelityBondSummary: { fbOutputs: [] as FidelityBondUtxo[] },
    isFetching: false,
    isLoading: false,
    jars: [] as Array<{
      balanceSummary: {
        calculatedAvailableBalanceInSats: number
        calculatedConfirmedAvailableBalanceInSats: number
        calculatedFrozenOrLockedBalanceInSats: number
        calculatedTotalBalanceInSats: number
      }
    }>,
    maxJarAvailableBalance: 100_000_000,
  },
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  startmakerMutation: vi.fn(() => ({ mutationFn: mocks.startMaker })),
  stopmakerOptions: vi.fn(() => ({ queryKey: ['stopmaker'], queryFn: vi.fn() })),
}))

type MutationOptions = {
  mutationFn: (input?: unknown) => Promise<unknown>
  onError?: (error: unknown) => void
  onMutate?: () => void
  onSuccess?: (result: unknown, input?: unknown) => void
}

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: MutationOptions) => {
    const isStartMaker = options.mutationFn === mocks.startMaker
    const state = isStartMaker ? mocks.startMutationState : mocks.stopMutationState

    return {
      ...state,
      mutateAsync: async (input?: unknown) => {
        options.onMutate?.()
        try {
          const result = await options.mutationFn(input)
          options.onSuccess?.(result, input)
          return result
        } catch (error) {
          options.onError?.(error)
          throw error
        }
      },
      reset: vi.fn(),
    }
  }),
  useQuery: vi.fn(() => ({
    refetch: mocks.stopMakerRefetch,
  })),
}))

vi.mock('react-i18next', () => ({
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => (
    <span>{children ?? i18nKey}</span>
  ),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

vi.mock('sonner', () => ({
  toast: {
    dismiss: mocks.toastDismiss,
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: ({ open }: { open: boolean }) => <div>fee-config-dialog:{String(open)}</div>,
}))

vi.mock('@/components/ui/jam/FeeConfigErrorAlert', () => ({
  FeeConfigErrorAlert: ({ onOpenFeeConfig }: { onOpenFeeConfig: () => void }) => (
    <button onClick={onOpenFeeConfig}>open-fee-config</button>
  ),
}))

vi.mock('@/components/ui/jam/PageLoading', () => ({
  PageLoading: () => <div>page-loading</div>,
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <h1>
      {title}:{subtitle}
    </h1>
  ),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => mocks.walletInfo,
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({
    isLoading: false,
    maxFeesConfigMissing: mocks.feeConfigMissing,
  }),
}))

vi.mock('@/hooks/useRefreshSession', () => ({
  useRefreshSession: vi.fn(),
}))

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (queryFn: unknown) => queryFn,
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  scrollToTop: mocks.scrollToTop,
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: mocks.developerMode }),
}))

vi.mock('./CreateFidelityBondDialog', () => ({
  CreateFidelityBondDialog: ({ open }: { open: boolean }) => <div>create-bond-dialog:{String(open)}</div>,
}))

vi.mock('./EarnForm', () => ({
  EarnForm: ({
    debug,
    disabled,
    onSubmit,
  }: {
    debug?: boolean
    disabled?: boolean
    onSubmit: (values: EarnFormValues) => Promise<void>
  }) => (
    <div>
      earn-form:{String(disabled)}:{String(debug)}
      <button
        onClick={() =>
          void onSubmit({
            offerMinAmount: 50_000,
            offerRelativeFeeInPercent: 0.5,
            offerType: 'sw0reloffer',
          })
        }
      >
        submit-earn
      </button>
    </div>
  ),
}))

vi.mock('./FidelityBondCard', () => ({
  FidelityBondCard: ({ children, value }: { children?: React.ReactNode; value: FidelityBondUtxo }) => (
    <div>
      fidelity-bond:{value.utxo}
      {children}
    </div>
  ),
}))

vi.mock('./MoveToJarDialog', () => ({
  MoveToJarDialog: ({ open }: { open: boolean }) => <div>move-to-jar-dialog:{String(open)}</div>,
}))

vi.mock('./OfferCard', () => ({
  OfferCard: ({ children, nickname }: { children?: React.ReactNode; nickname?: string }) => (
    <div>
      offer-card:{nickname}
      {children}
    </div>
  ),
}))

vi.mock('./RenewBondDialog', () => ({
  RenewBondDialog: ({ open }: { open: boolean }) => <div>renew-bond-dialog:{String(open)}</div>,
}))

vi.mock('./report/EarnReportOverlay', () => ({
  EarnReportOverlay: ({ open }: { open: boolean }) => <div>earn-report:{String(open)}</div>,
}))

const balanceSummary = {
  calculatedAvailableBalanceInSats: 100_000_000,
  calculatedConfirmedAvailableBalanceInSats: 100_000_000,
  calculatedFrozenOrLockedBalanceInSats: 0,
  calculatedTotalBalanceInSats: 100_000_000,
}

const expiredBond = {
  address: 'bc1qbond',
  confirmations: 12,
  frozen: false,
  label: '',
  locktime: '1970-01-01 00:00:00',
  path: "m/84'/1'/0':1",
  tries_remaining: 3,
  utxo: 'bond-tx:0',
  value: 50_000,
} as FidelityBondUtxo

const setSession = (overrides: Record<string, unknown> = {}) => {
  jmSessionStore.setState({
    state: {
      coinjoin_in_process: false,
      maker_running: false,
      nickname: 'maker-a',
      offer_list: [],
      rescanning: false,
      session: true,
      wallet_name: 'wallet.jmdat',
      ...overrides,
    },
  })
}

describe('EarnPage', () => {
  beforeEach(() => {
    mocks.developerMode = false
    mocks.feeConfigMissing = false
    mocks.scrollToTop.mockReset()
    mocks.startMaker.mockReset()
    mocks.startMaker.mockResolvedValue({})
    mocks.startMutationState.isPending = false
    mocks.startMutationState.isSuccess = false
    mocks.stopMakerRefetch.mockReset()
    mocks.stopMakerRefetch.mockResolvedValue({ data: {} })
    mocks.stopMutationState.isPending = false
    mocks.stopMutationState.isSuccess = false
    mocks.toastDismiss.mockReset()
    mocks.toastError.mockReset()
    mocks.toastInfo.mockReset()
    mocks.toastSuccess.mockReset()
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [] }
    mocks.walletInfo.isFetching = false
    mocks.walletInfo.isLoading = false
    mocks.walletInfo.jars = [{ balanceSummary }]
    mocks.walletInfo.maxJarAvailableBalance = 100_000_000
    setSession()
  })

  it('shows loading until session and wallet info are ready', () => {
    jmSessionStore.setState({ state: undefined })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('page-loading')).toBeInTheDocument()
  })

  it('starts earning and opens fee/report dialogs', async () => {
    const user = userEvent.setup()
    mocks.feeConfigMissing = true

    render(<EarnPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('open-fee-config'))
    expect(screen.getByText('fee-config-dialog:true')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'earn.button_show_report' }))
    expect(screen.getByText('earn-report:true')).toBeInTheDocument()

    await user.click(screen.getByText('submit-earn'))
    await waitFor(() => expect(mocks.startMaker).toHaveBeenCalled())
    expect(mocks.startMaker).toHaveBeenCalledWith({
      body: {
        cjfee_a: '0',
        cjfee_r: '0.005',
        minsize: '50000',
        ordertype: 'sw0reloffer',
        txfee: '0',
      },
      path: { walletname: 'wallet.jmdat' },
    })
    expect(mocks.scrollToTop).toHaveBeenCalled()
  })

  it('shows running maker offer and stops it', async () => {
    const user = userEvent.setup()
    setSession({
      maker_running: true,
      offer_list: [{ cjfee: '250', minsize: '5000', ordertype: 'sw0absoffer' }],
    })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('offer-card:maker-a')).toBeInTheDocument()
    expect(screen.getByText('earn.alert_running')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'earn.button_stop' }))
    expect(mocks.stopMakerRefetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('shows waiting states while maker updates', () => {
    mocks.startMutationState.isSuccess = true

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('Waiting for maker to start...')).toBeInTheDocument()
  })

  it('opens fidelity bond actions', async () => {
    const user = userEvent.setup()
    mocks.developerMode = true
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [expiredBond] }

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('fidelity-bond:bond-tx:0')).toBeInTheDocument()
    expect(screen.getByText(/walletInfo\.fidelityBondSummary\.fbOutputs/u)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_spend/u }))
    expect(screen.getByText('move-to-jar-dialog:true')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_renew/u }))
    expect(screen.getByText('renew-bond-dialog:true')).toBeInTheDocument()
  })
})
