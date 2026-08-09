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
  orderbookData: vi.fn<() => unknown>(),
  orderbookQueryState: {
    isError: false,
    isLoading: false,
  },
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

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
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
          // do not rethrow: the component fires these mutations without catching,
          // and the UI is driven entirely by the onError handler above
          return undefined
        }
      },
      reset: vi.fn(),
    }
  }),
  useQuery: vi.fn((options: { queryKey?: unknown[] }) =>
    options.queryKey?.[0] === 'orderbook'
      ? { ...mocks.orderbookQueryState, data: mocks.orderbookData() }
      : {
          refetch: mocks.stopMakerRefetch,
        },
  ),
}))

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: unknown }) =>
    values ? `${i18nKey}:${JSON.stringify(values)}` : i18nKey,
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
        disabled={disabled}
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
  OfferCard: ({
    children,
    nickname,
    orderbookStatus,
    orderbookOffer,
    fidelityBond,
  }: {
    children?: React.ReactNode
    nickname?: string
    orderbookStatus?: string
    orderbookOffer?: { fidelity_bond_value?: number }
    fidelityBond?: { amount?: number }
  }) => (
    <div>
      offer-card:{nickname}
      <span>orderbook-status:{orderbookStatus}</span>
      <span>bond-value:{orderbookOffer?.fidelity_bond_value}</span>
      <span>bond-amount:{fidelityBond?.amount}</span>
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

const expiredBond: FidelityBondUtxo = {
  address: 'bc1qbond',
  confirmations: 12,
  frozen: false,
  label: '',
  locktime: '2000-01-01 00:00:00',
  path: "m/84'/1'/0':1",
  tries_remaining: 3,
  utxo: 'bond-tx:0',
  value: 50_000,
  tries: 3,
  external: false,
  mixdepth: 0,
}

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
    mocks.orderbookData.mockReset()
    mocks.orderbookData.mockReturnValue(undefined)
    mocks.orderbookQueryState.isError = false
    mocks.orderbookQueryState.isLoading = false
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

    expect(screen.queryByText('submit-earn')).not.toBeInTheDocument()
  })

  it('starts earning', async () => {
    const user = userEvent.setup()

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.queryByText('earn.precondition.title')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'earn.button_stop' })).not.toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeEnabled()

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

  it('opens fee/report dialogs', async () => {
    const user = userEvent.setup()
    mocks.feeConfigMissing = true

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('submit-earn')).toBeEnabled()

    await user.click(screen.getByText('open-fee-config'))
    expect(screen.getByText('fee-config-dialog:true')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'earn.button_show_report' }))
    expect(screen.getByText('earn-report:true')).toBeInTheDocument()
  })

  it('shows running maker offer and stops it', async () => {
    const user = userEvent.setup()
    setSession({
      maker_running: true,
      offer_list: [{ cjfee: '250', minsize: '5000', ordertype: 'sw0absoffer' }],
    })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.alert_running')).toBeInTheDocument()
    expect(screen.getByText('offer-card:maker-a')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'earn.button_stop' })).toBeEnabled()
    expect(screen.getByText('submit-earn')).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'earn.button_stop' }))
    expect(mocks.stopMakerRefetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('shows the current offer and fidelity bond from the local orderbook', () => {
    setSession({
      maker_running: true,
      offer_list: [{ oid: 7, cjfee: '250', minsize: '5000', ordertype: 'sw0absoffer' }],
    })
    mocks.orderbookData.mockReturnValue({
      offers: [{ counterparty: 'maker-a', oid: 7, fidelity_bond_value: 42_000 }],
      fidelitybonds: [{ counterparty: 'maker-a', amount: 100_000, locktime: 1_800_000_000 }],
    })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('orderbook-status:visible')).toBeInTheDocument()
    expect(screen.getByText('bond-value:42000')).toBeInTheDocument()
    expect(screen.getByText('bond-amount:100000')).toBeInTheDocument()
  })

  it('shows waiting states while maker updates', () => {
    mocks.startMutationState.isSuccess = true

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.alert_waiting_start_title')).toBeInTheDocument()
  })

  it('display debug output in developer mode', () => {
    mocks.developerMode = true
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [expiredBond] }

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText(/walletInfo\.fidelityBondSummary\.fbOutputs/u)).toBeInTheDocument()
  })

  it('enables creating a fidelity bond', async () => {
    const user = userEvent.setup()

    expect(mocks.walletInfo.fidelityBondSummary.fbOutputs, 'sanity check').toHaveLength(0)

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('create-bond-dialog:false')).toBeInTheDocument()

    const createFidelityBondButton = screen.getByRole('button', {
      name: 'earn.fidelity_bond.create_form.button_create',
    })
    expect(createFidelityBondButton).toBeEnabled()

    await user.click(createFidelityBondButton)
    expect(screen.getByText('create-bond-dialog:true')).toBeInTheDocument()
  })

  it('disables creating a fidelity bond while rescanning', async () => {
    const user = userEvent.setup()
    setSession({
      rescanning: true,
    })

    expect(mocks.walletInfo.fidelityBondSummary.fbOutputs, 'sanity check').toHaveLength(0)

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('create-bond-dialog:false')).toBeInTheDocument()

    const createFidelityBondButton = screen.getByRole('button', {
      name: 'earn.fidelity_bond.create_form.button_create',
    })
    expect(createFidelityBondButton).toBeDisabled()

    await user.click(createFidelityBondButton)
    expect(screen.getByText('create-bond-dialog:false')).toBeInTheDocument()
  })

  it('enables fidelity bond actions on existing fidelity bond', async () => {
    const user = userEvent.setup()
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [expiredBond] }

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('fidelity-bond:bond-tx:0')).toBeInTheDocument()

    expect(screen.queryByText('move-to-jar-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('move-to-jar-dialog:true')).not.toBeInTheDocument()
    expect(screen.queryByText('renew-bond-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('renew-bond-dialog:true')).not.toBeInTheDocument()

    const moveToJarButton = screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_spend/u })
    expect(moveToJarButton).toBeEnabled()

    await user.click(moveToJarButton)
    expect(screen.getByText('move-to-jar-dialog:true')).toBeInTheDocument()

    const renewButton = screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_renew/u })
    expect(renewButton).toBeEnabled()

    await user.click(renewButton)
    expect(screen.getByText('renew-bond-dialog:true')).toBeInTheDocument()
  })

  it('disables fidelity bond actions on existing fidelity bond when rescanning is active', async () => {
    const user = userEvent.setup()
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [expiredBond] }
    setSession({
      rescanning: true,
    })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.queryByText('move-to-jar-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('move-to-jar-dialog:true')).not.toBeInTheDocument()
    expect(screen.queryByText('renew-bond-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('renew-bond-dialog:true')).not.toBeInTheDocument()

    const moveToJarButton = screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_spend/u })
    expect(moveToJarButton).toBeDisabled()

    await user.click(moveToJarButton)
    expect(screen.queryByText('move-to-jar-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('move-to-jar-dialog:true')).not.toBeInTheDocument()

    const renewButton = screen.getByRole('button', { name: /earn\.fidelity_bond\.existing\.button_renew/u })
    expect(renewButton).toBeDisabled()

    await user.click(renewButton)
    expect(screen.queryByText('renew-bond-dialog:false')).not.toBeInTheDocument()
    expect(screen.queryByText('renew-bond-dialog:true')).not.toBeInTheDocument()
  })

  it('shows the coinjoin-in-progress alert', () => {
    setSession({ coinjoin_in_process: true })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('shows the waiting-to-stop alert', () => {
    setSession({ maker_running: true })
    mocks.stopMutationState.isSuccess = true

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.alert_waiting_stop_title')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('shows the loading-offer alert while the maker runs without an offer', () => {
    setSession({ maker_running: true, offer_list: [] })

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.alert_loading_offer')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('warns when the spendable balance is only unconfirmed', () => {
    mocks.walletInfo.jars = [{ balanceSummary: { ...balanceSummary, calculatedConfirmedAvailableBalanceInSats: 0 } }]
    mocks.walletInfo.maxJarAvailableBalance = 100_000_000

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.precondition.title')).toBeInTheDocument()
    expect(screen.getByText('earn.precondition.hint_missing_confirmations:{"count":1}')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('warns when there is no spendable balance at all', () => {
    mocks.walletInfo.jars = [{ balanceSummary: { ...balanceSummary, calculatedConfirmedAvailableBalanceInSats: 0 } }]
    mocks.walletInfo.maxJarAvailableBalance = 0

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.precondition.title')).toBeInTheDocument()
    expect(screen.getByText('earn.precondition.hint_missing_utxos')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('warns when there are unfrozen fidelity bonds', () => {
    mocks.walletInfo.fidelityBondSummary = {
      fbOutputs: [
        {
          ...expiredBond,
          frozen: false,
        },
      ],
    }

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('earn.precondition.title')).toBeInTheDocument()
    expect(screen.getByText('earn.precondition.hint_non_frozen_fidelity_bond:{"count":1}')).toBeInTheDocument()

    expect(screen.getByText('submit-earn')).toBeDisabled()
  })

  it('shows an error toast when starting the maker fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    mocks.startMaker.mockRejectedValue(new Error('start boom'))

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('submit-earn')).toBeEnabled()

    await user.click(screen.getByText('submit-earn'))
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())

    errorSpy.mockRestore()
  })

  it('shows an error toast when stopping the maker fails', async () => {
    const user = userEvent.setup()
    setSession({ maker_running: true, offer_list: [{ cjfee: '250', minsize: '5000', ordertype: 'sw0absoffer' }] })
    mocks.stopMakerRefetch.mockRejectedValue(new Error('stop boom'))

    render(<EarnPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('submit-earn')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'earn.button_stop' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'earn.button_stop' }))
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())
  })

  it('announces success once the maker is running after a successful start', () => {
    setSession({ maker_running: true })
    mocks.startMutationState.isSuccess = true
    render(<EarnPage walletFileName="wallet.jmdat" />)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('earn.alert_running', expect.anything())
  })
})
