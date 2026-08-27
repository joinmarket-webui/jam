import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { jmSessionStore } from '@/store/jmSessionStore'
import { jmTxStore } from '@/store/jmTxStore'
import { flushActUpdates } from '@/test/flushActUpdates'
import { SendPage } from './SendPage'
import type { SendFormValues } from './types'

const mocks = vi.hoisted(() => ({
  clearCurrentPaymentAttempt: vi.fn(),
  currentPaymentAttemptPresent: false,
  directSend: vi.fn(),
  fetchIfMissing: vi.fn(),
  feeConfigMissing: false,
  getFeeConfigValues: vi.fn<() => JamFeeConfigValues>(),
  onOpenUtxoSelector: vi.fn(),
  scrollToTop: vi.fn(),
  setCurrentPaymentAttempt: vi.fn(),
  setWaitForUtxosToBeSpent: vi.fn(),
  startCoinjoin: vi.fn(),
  stopCoinjoinRefetch: vi.fn(),
  takerRunning: false,
  schedulerRunning: false,
  makerRunning: false,
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  utxoSelectorDisabled: false,
  walletInfoIsFetching: false,
  walletInfoIsLoading: false,
  waitForUtxosToBeSpent: [] as string[],
  hasOrders: true,
  orderbookIsLoading: false,
  orderbookError: null as Error | null,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({ mutationFn: mocks.directSend })),
  docoinjoinMutation: vi.fn(() => ({ mutationFn: mocks.startCoinjoin })),
  stopcoinjoinOptions: vi.fn(() => ({ queryKey: ['stopcoinjoin'], queryFn: vi.fn() })),
}))

type MutationOptions = {
  mutationFn: (input?: unknown) => Promise<unknown>
  onError?: (error: unknown) => void
  onMutate?: () => void
  onSuccess?: (result: unknown, input?: unknown) => void
}

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: MutationOptions) => ({
    error: undefined,
    isPending: false,
    isSuccess: false,
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
  })),
  useQuery: vi.fn(() => ({
    refetch: mocks.stopCoinjoinRefetch,
  })),
}))

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: unknown }) =>
    values ? `${i18nKey}:${JSON.stringify(values)}` : i18nKey,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('@/hooks/useQueryOrderbook', () => ({
  useQueryOrderbook: () => ({
    hasOrders: mocks.hasOrders,
    queryResult: {
      isLoading: mocks.orderbookIsLoading,
      error: mocks.orderbookError,
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
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

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({
    feeConfigValues: mocks.getFeeConfigValues(),
    // getter so a captured reference reflects later toggles of mocks.feeConfigMissing
    get maxFeesConfigMissing() {
      return mocks.feeConfigMissing
    },
  }),
}))

vi.mock('@/hooks/useJmConfig', () => ({
  useJmConfig: () => ({
    fetchIfMissing: mocks.fetchIfMissing,
  }),
}))

vi.mock('@/hooks/useRefreshSession', () => ({
  useRefreshSession: vi.fn(),
}))

vi.mock('@/hooks/useUtxoSelectionDialog', () => ({
  useUtxoSelectionDialog: () => ({
    dialogProps: { open: false },
    isSubmitting: false,
    onOpenUtxoSelector: mocks.onOpenUtxoSelector,
    utxoSelectorDisabled: mocks.utxoSelectorDisabled,
  }),
}))

vi.mock('@/lib/queryClient', () => ({
  withMutationDelay: (mutationFn: unknown) => mutationFn,
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  scrollToTop: mocks.scrollToTop,
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: true }),
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({ addressChunkingEnabled: false }),
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => ({
    clearCurrentPaymentAttempt: mocks.clearCurrentPaymentAttempt,
    rescanInfo: { rescanning: false },
    setCurrentPaymentAttempt: mocks.setCurrentPaymentAttempt,
    takerInfo: {
      currentPaymentAttempt: mocks.takerRunning || mocks.currentPaymentAttemptPresent ? collaborativeValues : undefined,
      running: mocks.takerRunning,
      scheduler: {
        running: mocks.schedulerRunning,
      },
    },
    makerInfo: {
      running: mocks.makerRunning,
    },
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useAddressSummary: () => ({ addressSummary: {} }),
  useJamWalletInfoContext: () => ({
    isFetching: mocks.walletInfoIsFetching,
    isLoading: mocks.walletInfoIsLoading,
    setWaitForUtxosToBeSpent: mocks.setWaitForUtxosToBeSpent,
    utxosHashHex: 'hash-before',
    waitForUtxosToBeSpent: mocks.waitForUtxosToBeSpent,
  }),
  useJars: () => ({ jars }),
  useWalletBalanceSummary: () => ({ walletBalanceSummary: balanceSummary }),
}))

vi.mock('./PaymentAbortDialog', () => ({
  PaymentAbortDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => Promise<void> }) => (
    <div>
      abort-dialog:{String(open)}
      {open ? <button onClick={() => void onConfirm()}>confirm-abort</button> : null}
    </div>
  ),
}))

vi.mock('./PaymentConfirmDialog', () => ({
  default: ({
    open,
    onConfirm,
    values,
  }: {
    open: boolean
    onConfirm: (values: SendFormValues) => Promise<void>
    values: SendFormValues
  }) => (
    <div>
      payment-confirm:{String(open)}
      {open ? <button onClick={() => void onConfirm(values).catch(() => {})}>confirm-payment</button> : null}
    </div>
  ),
}))

vi.mock('./SendForm', () => ({
  SendForm: ({
    disabled,
    onSourceJarChange,
    onSubmit,
    sourceJarLabelButton,
  }: {
    disabled?: boolean
    onSourceJarChange?: (jarIndex: number | undefined) => void
    onSubmit: (values: SendFormValues) => void
    sourceJarLabelButton?: () => React.ReactElement
  }) => (
    <div>
      send-form:{String(disabled)}
      <div>{sourceJarLabelButton?.()}</div>
      <button
        onClick={() => {
          onSourceJarChange?.(0)
          onSubmit(directValues)
        }}
      >
        submit-direct
      </button>
      <button
        onClick={() => {
          onSourceJarChange?.(0)
          onSubmit(collaborativeValues.data)
        }}
      >
        submit-coinjoin
      </button>
    </div>
  ),
}))

vi.mock('./UtxoSelectionDialog', () => ({
  UtxoSelectionDialog: () => <div>utxo-selection-dialog</div>,
}))

const balanceSummary = {
  calculatedAvailableBalanceInSats: 20_000,
  calculatedConfirmedAvailableBalanceInSats: 20_000,
  calculatedAvailableFrozenBalanceInSats: 0,
  calculatedFrozenOrLockedBalanceInSats: 0,
  calculatedTotalBalanceInSats: 20_000,
}

const utxo = {
  address: 'bc1qsource',
  confirmations: 3,
  frozen: false,
  label: '',
  locktime: undefined,
  tries_remaining: 3,
  utxo: 'source-tx:0',
  value: 20_000,
} as unknown as Utxo

const jars: Jar[] = [
  {
    balanceSummary,
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Zero',
    utxos: [utxo],
  },
  {
    balanceSummary,
    color: '#3b5ba9',
    jarIndex: 1,
    name: 'One',
    utxos: [],
  },
]

const directValues: SendFormValues = {
  amount: { amount: 1_000, isSweep: false, sweepAmount: undefined, sweepUtxos: undefined },
  destination: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', fromJar: undefined },
  isCoinJoin: false,
  source: { fromJar: 0 },
  txFee: { txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined, txFeeUnit: TX_FEE_UNITS.BLOCKS },
}

const collaborativeValues = {
  createdAt: 1,
  data: {
    ...directValues,
    isCoinJoin: true,
    numCollaborators: 4,
  },
  utxosHashHex: 'hash-before',
  walletFileName: 'wallet.jmdat',
}

describe('SendPage', () => {
  beforeEach(() => {
    mocks.clearCurrentPaymentAttempt.mockReset()
    mocks.currentPaymentAttemptPresent = false
    mocks.directSend.mockReset()
    mocks.fetchIfMissing.mockReset()
    mocks.fetchIfMissing.mockResolvedValue({ value: '4' })
    mocks.feeConfigMissing = false
    mocks.getFeeConfigValues.mockReset()
    mocks.getFeeConfigValues.mockReturnValue({
      maxCjAbsoluteFee: 10_000,
      maxCjRelativeFee: 0.01,
      txFee: directValues.txFee,
    })
    mocks.onOpenUtxoSelector.mockReset()
    mocks.scrollToTop.mockReset()
    mocks.setCurrentPaymentAttempt.mockReset()
    mocks.setWaitForUtxosToBeSpent.mockReset()
    mocks.startCoinjoin.mockReset()
    mocks.stopCoinjoinRefetch.mockReset()
    mocks.stopCoinjoinRefetch.mockResolvedValue({ data: {} })
    mocks.takerRunning = false
    mocks.schedulerRunning = false
    mocks.toastError.mockReset()
    mocks.toastInfo.mockReset()
    mocks.toastSuccess.mockReset()
    mocks.utxoSelectorDisabled = false
    mocks.walletInfoIsFetching = false
    mocks.walletInfoIsLoading = false
    mocks.waitForUtxosToBeSpent = []
    mocks.hasOrders = true
    mocks.orderbookIsLoading = false
    mocks.orderbookError = null
    jmSessionStore.setState({
      state: {
        coinjoin_in_process: false,
        maker_running: false,
        session: true,
        wallet_name: 'wallet.jmdat',
        rescanning: false,
      },
    })
    jmTxStore.getState().clear()
  })

  it('shows loading until session and wallet data are ready', async () => {
    jmSessionStore.setState({ state: undefined })

    render(<SendPage walletFileName="wallet.jmdat" />)
    await flushActUpdates()

    expect(screen.getByText('page-loading')).toBeInTheDocument()
  })

  it('confirms a direct send and stores the transaction result', async () => {
    const user = userEvent.setup()
    mocks.directSend.mockResolvedValue({
      txinfo: {
        inputs: [{ outpoint: 'source-tx:0' }],
        outputs: [{ address: directValues.destination.address, value_sats: 1_000 }],
        txid: 'txid-success',
      },
    })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-direct'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(mocks.directSend).toHaveBeenCalled())
    expect(jmTxStore.getState().get('txid-success')).toBeDefined()
    expect(mocks.setWaitForUtxosToBeSpent).toHaveBeenCalledWith(['source-tx:0'])
    expect(mocks.toastSuccess).toHaveBeenCalledWith('send.alert_direct_payment_success_title')
    expect(screen.getByText(/send.alert_payment_successful/u)).toBeInTheDocument()
  })

  it('opens fee config instead of starting CoinJoin when max fees are missing', async () => {
    const user = userEvent.setup()
    mocks.feeConfigMissing = true

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-coinjoin'))

    expect(mocks.startCoinjoin).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalledWith('send.taker_error_message_max_fees_config_missing')
    expect(screen.getByText('fee-config-dialog:true')).toBeInTheDocument()
  })

  it('shows the running CoinJoin state and confirms abort', async () => {
    const user = userEvent.setup()
    mocks.takerRunning = true
    mocks.schedulerRunning = false

    render(<SendPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()
    expect(screen.getByText('send-form:true')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'global.abort' }))
    expect(screen.getByText('abort-dialog:true')).toBeInTheDocument()

    await user.click(screen.getByText('confirm-abort'))
    expect(mocks.stopCoinjoinRefetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('shows the running CoinJoin state with abort button not present', async () => {
    mocks.takerRunning = true
    mocks.schedulerRunning = true

    render(<SendPage walletFileName="wallet.jmdat" />)
    await flushActUpdates()

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()
    expect(screen.getByText('send-form:true')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'global.abort' })).not.toBeInTheDocument()
  })

  it('confirms and starts a collaborative transaction', async () => {
    const user = userEvent.setup()
    mocks.startCoinjoin.mockResolvedValue({})

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-coinjoin'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(mocks.startCoinjoin).toHaveBeenCalled())
    expect(mocks.setCurrentPaymentAttempt).toHaveBeenCalled()
  })

  it('rejects confirmed CoinJoin when max fees config goes missing after submit', async () => {
    const user = userEvent.setup()

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-coinjoin'))
    mocks.feeConfigMissing = true
    await user.click(screen.getByText('confirm-payment'))

    expect(mocks.startCoinjoin).not.toHaveBeenCalled()
    expect(mocks.toastError).toHaveBeenCalledWith('send.taker_error_message_max_fees_config_missing')
  })

  it('handles errors thrown by the collaborative transaction', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    mocks.startCoinjoin.mockRejectedValue({ message: 'coinjoin boom' })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-coinjoin'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(screen.getByText(/send.error_starting_collaborative_transaction/u)).toBeInTheDocument())
    expect(mocks.setCurrentPaymentAttempt).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('handles errors thrown by the direct transaction', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    mocks.directSend.mockRejectedValue({ message: 'direct boom' })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-direct'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('direct boom')))
    consoleError.mockRestore()
  })

  it('succeeds without a matching output or input outpoints', async () => {
    const user = userEvent.setup()
    mocks.directSend.mockResolvedValue({
      txinfo: {
        inputs: [{ outpoint: undefined }, undefined],
        outputs: [{ address: 'bc1qother', value_sats: 5 }],
        txid: 'txid-no-match',
      },
    })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-direct'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(mocks.directSend).toHaveBeenCalled())
    expect(mocks.setWaitForUtxosToBeSpent).toHaveBeenCalledWith([])
  })

  it('succeeds when txinfo has no inputs array', async () => {
    const user = userEvent.setup()
    mocks.directSend.mockResolvedValue({
      txinfo: {
        outputs: [{ address: directValues.destination.address, value_sats: 1_000 }],
        txid: 'txid-no-inputs',
      },
    })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('submit-direct'))
    await user.click(screen.getByText('confirm-payment'))

    await waitFor(() => expect(mocks.setWaitForUtxosToBeSpent).toHaveBeenCalledWith([]))
  })

  it('shows the fee config error alert and opens the dialog', async () => {
    const user = userEvent.setup()
    mocks.feeConfigMissing = true

    render(<SendPage walletFileName="wallet.jmdat" />)

    await user.click(screen.getByText('open-fee-config'))
    expect(screen.getByText('fee-config-dialog:true')).toBeInTheDocument()
  })

  it('shows the maker running warning', async () => {
    mocks.makerRunning = true

    render(<SendPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.text_maker_running')).toBeInTheDocument()
    expect(screen.getByText('send-form:true')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows the waiting-for-utxos alert and disables the form', async () => {
    mocks.waitForUtxosToBeSpent = ['spent-tx:0']

    render(<SendPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.alert_waiting_utxos_spent')).toBeInTheDocument()
    expect(screen.getByText('send-form:true')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows the collaborative awaiting completion alert while wallet info is fetching', async () => {
    mocks.currentPaymentAttemptPresent = true
    mocks.walletInfoIsFetching = true

    render(<SendPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.alert_collaborative_awaiting_completion')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows the collaborative ended alert when utxos are unchanged and clears the attempt', async () => {
    const user = userEvent.setup()
    mocks.currentPaymentAttemptPresent = true

    render(<SendPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.alert_collaborative_ended_title')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'global.done' }))
    expect(mocks.clearCurrentPaymentAttempt).toHaveBeenCalled()
  })

  it('handles errors loading minimum makers config', async () => {
    mocks.fetchIfMissing.mockRejectedValue({ message: 'config boom' })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('send.error_loading_min_makers_failed')),
    )
  })

  it('ignores an invalid minimum makers config value', async () => {
    mocks.fetchIfMissing.mockResolvedValue({ value: '0' })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await waitFor(() => expect(mocks.fetchIfMissing).toHaveBeenCalled())
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('ignores a missing minimum makers config value', async () => {
    mocks.fetchIfMissing.mockResolvedValue({ value: undefined })

    render(<SendPage walletFileName="wallet.jmdat" />)

    await waitFor(() => expect(mocks.fetchIfMissing).toHaveBeenCalled())
    expect(mocks.toastError).not.toHaveBeenCalled()
  })
})
