import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UseFormReturn } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar, useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { SweepFormValues } from './SweepFormSchema'
import { SweepPage } from './SweepPage'
import type { Schedule } from './scheduleUtils'

const VALID_DESTINATIONS = [
  'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
  '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
]

type WalletInfo = ReturnType<typeof useJamWalletInfoContext>

const activeSchedule: Schedule = [
  [0, 0, 8, 'INTERNAL', 5, 16, 1],
  [1, 0, 8, VALID_DESTINATIONS[0], 0, 16, 0],
]

const mocks = vi.hoisted(() => ({
  debugFeatureEnabled: false,
  feeConfigMissing: false,
  feeConfigLoading: false,
  getScheduleResult: undefined as { schedule?: Schedule } | null | undefined,
  runSchedule: vi.fn<(input?: unknown) => Promise<{ schedule: Schedule }>>(),
  scheduleQuery: { data: undefined as { schedule?: Schedule } | null | undefined },
  startReset: vi.fn(),
  startState: { isPending: false, isSuccess: false },
  stopScheduleRefetch: vi.fn<() => Promise<{ data: unknown }>>(),
  stopReset: vi.fn(),
  stopState: { isPending: false, isSuccess: false },
  toastError: vi.fn(),
  walletInfo: undefined as WalletInfo | undefined,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  runscheduleMutation: vi.fn(() => ({ mutationFn: mocks.runSchedule })),
  stopcoinjoinOptions: vi.fn(() => ({ queryKey: ['stopcoinjoin'], queryFn: vi.fn() })),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/jm', () => ({
  getschedule: vi.fn(() => Promise.resolve({ data: mocks.getScheduleResult })),
}))

type MutationOptions = {
  mutationFn: (input?: unknown) => Promise<unknown>
  onError?: (error: Error) => void
  onMutate?: () => void
  onSuccess?: (result: { schedule?: Schedule }) => void
}

type QueryOptions = {
  queryKey?: unknown
}

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: MutationOptions) => {
    const isStartSchedule = options.mutationFn === mocks.runSchedule
    const state = isStartSchedule ? mocks.startState : mocks.stopState

    return {
      error: undefined,
      isPending: state.isPending,
      isSuccess: state.isSuccess,
      mutateAsync: async (input?: unknown) => {
        options.onMutate?.()
        try {
          const result = (await options.mutationFn(input)) as { schedule?: Schedule }
          options.onSuccess?.(result)
          return result
        } catch (error) {
          options.onError?.(error instanceof Error ? error : new Error(String(error)))
          // do not rethrow: the component fires these mutations without catching,
          // and the UI is driven entirely by the onError handler above
          return undefined
        }
      },
      reset: isStartSchedule ? mocks.startReset : mocks.stopReset,
    }
  }),
  useQuery: vi.fn((options: QueryOptions) => {
    if (Array.isArray(options.queryKey) && options.queryKey[0] === 'sweep-get-schedule') {
      return mocks.scheduleQuery
    }

    return {
      refetch: mocks.stopScheduleRefetch,
    }
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: ({ open }: { open: boolean }) => (open ? <div>fee-config-dialog</div> : null),
}))

vi.mock('@/components/sweep/SweepDestinationInputs', () => ({
  SweepDestinationInputs: ({ disabled, form }: { disabled: boolean; form: UseFormReturn<SweepFormValues> }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        VALID_DESTINATIONS.forEach((address, index) => {
          form.setValue(`destinations.${index}.address`, address, { shouldDirty: true, shouldValidate: true })
        })
        void form.trigger('destinations')
      }}
    >
      fill-destinations
    </button>
  ),
}))

vi.mock('@/components/sweep/SweepPreconditionAlert', () => ({
  SweepPreconditionAlert: ({ summary }: { summary: { isFulfilled: boolean } }) => (
    <div>preconditions:{String(summary.isFulfilled)}</div>
  ),
}))

vi.mock('@/components/sweep/SweepScheduleProgress', () => ({
  SweepScheduleProgress: ({ isStopping, onStop }: { isStopping: boolean; onStop: () => void }) => (
    <div>
      schedule-progress:{String(isStopping)}
      <button type="button" onClick={onStop}>
        stop-sweep
      </button>
    </div>
  ),
}))

vi.mock('@/components/sweep/SweepStartConfirmDialog', () => ({
  SweepStartConfirmDialog: ({
    disabled,
    onConfirm,
    open,
  }: {
    disabled: boolean
    onConfirm: () => void
    open: boolean
  }) =>
    open ? (
      <button type="button" disabled={disabled} onClick={onConfirm}>
        confirm-sweep
      </button>
    ) : null,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

vi.mock('@/components/ui/jam/FeeConfigErrorAlert', () => ({
  FeeConfigErrorAlert: ({ onOpenFeeConfig }: { onOpenFeeConfig: () => void }) => (
    <button type="button" onClick={onOpenFeeConfig}>
      open-fee-config
    </button>
  ),
}))

vi.mock('@/components/ui/jam/PageLoading', () => ({
  PageLoading: () => <div>page-loading</div>,
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ subtitle, title }: { subtitle: string; title: string }) => (
    <h1>
      {title}:{subtitle}
    </h1>
  ),
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDebugFeatureEnabled: () => mocks.debugFeatureEnabled,
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => mocks.walletInfo,
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/hooks/useFeeConfigValidation', () => ({
  useFeeConfigValidation: () => ({
    isLoading: mocks.feeConfigLoading,
    maxFeesConfigMissing: mocks.feeConfigMissing,
  }),
}))

vi.mock('@/hooks/useRefreshSession', () => ({
  useRefreshSession: vi.fn(),
}))

const makeUtxo = (overrides: Partial<Utxo> = {}): Utxo =>
  ({
    address: 'bc1qsource',
    confirmations: 6,
    frozen: false,
    label: '',
    locktime: undefined,
    mixdepth: 0,
    path: '',
    tries_remaining: 3,
    utxo: 'source-tx:0',
    value: 100_000,
    ...overrides,
  }) as Utxo

const makeWalletInfo = (overrides: Partial<WalletInfo> = {}): WalletInfo => {
  const jar: Jar = {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 100_000,
      calculatedTotalBalanceInSats: 100_000,
      calculatedConfirmedAvailableBalanceInSats: 100_000,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Jar 0',
    utxos: [makeUtxo()],
  }

  return {
    accountSummary: {},
    addressSummary: {},
    detectedNetwork: null,
    error: null,
    fidelityBondSummary: { fbOutputs: [] },
    isFetching: false,
    isLoading: false,
    jars: [jar],
    maxJarAvailableBalance: 100_000,
    refetch: vi.fn(),
    setWaitForUtxosToBeSpent: vi.fn(),
    utxosHashHex: 'hash',
    waitForUtxosToBeSpent: [],
    walletBalanceSummary: {
      calculatedAvailableBalanceInSats: 100_000,
      calculatedTotalBalanceInSats: 100_000,
      calculatedConfirmedAvailableBalanceInSats: 100_000,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    walletName: 'wallet.jmdat',
    ...overrides,
  }
}

const setSession = (overrides: Record<string, unknown> = {}) => {
  jmSessionStore.setState({
    state: {
      coinjoin_in_process: false,
      maker_running: false,
      rescanning: false,
      session: true,
      wallet_name: 'wallet.jmdat',
      ...overrides,
    },
  })
}

describe('SweepPage', () => {
  beforeEach(() => {
    mocks.debugFeatureEnabled = false
    mocks.feeConfigLoading = false
    mocks.feeConfigMissing = false
    mocks.getScheduleResult = undefined
    mocks.runSchedule.mockReset()
    mocks.runSchedule.mockResolvedValue({ schedule: activeSchedule })
    mocks.scheduleQuery = { data: undefined }
    mocks.startReset.mockReset()
    mocks.startState = { isPending: false, isSuccess: false }
    mocks.stopScheduleRefetch.mockReset()
    mocks.stopScheduleRefetch.mockResolvedValue({ data: null })
    mocks.stopReset.mockReset()
    mocks.stopState = { isPending: false, isSuccess: false }
    mocks.toastError.mockReset()
    mocks.walletInfo = makeWalletInfo()
    setSession()
  })

  it('shows loading while session, fee config, or wallet info is loading', () => {
    jmSessionStore.setState({ state: undefined })
    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('page-loading')).toBeInTheDocument()
  })

  it('opens the fee config dialog when required fees are missing', () => {
    mocks.feeConfigMissing = true

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('preconditions:true')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'open-fee-config' }))

    expect(screen.getByText('fee-config-dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'scheduler.button_start' })).toBeDisabled()
  })

  it('builds and submits a sweep schedule after confirmation', async () => {
    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'fill-destinations' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

    await waitFor(() => expect(mocks.runSchedule).toHaveBeenCalledTimes(1))
    expect(mocks.runSchedule).toHaveBeenCalledWith({
      body: {
        destination_addresses: VALID_DESTINATIONS,
      },
      path: { walletname: 'wallet.jmdat' },
    })
  })

  it('stops a running sweep schedule', async () => {
    setSession({ coinjoin_in_process: true, schedule: activeSchedule })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('schedule-progress:false')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'stop-sweep' }))

    await waitFor(() => expect(mocks.stopScheduleRefetch).toHaveBeenCalledWith({ throwOnError: true }))
  })

  it('shows blocking alerts while other collaborative operations are running', () => {
    setSession({ coinjoin_in_process: true, maker_running: true })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()
    expect(screen.getByText('send.text_maker_running')).toBeInTheDocument()
  })

  it('shows the single coinjoin running alert when coinjoin runs without a schedule', () => {
    setSession({ coinjoin_in_process: true })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()
    expect(screen.queryByText('send.text_maker_running')).not.toBeInTheDocument()
  })

  it('shows loading while fee config is loading', () => {
    mocks.feeConfigLoading = true

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('page-loading')).toBeInTheDocument()
  })

  it('shows loading while wallet info is loading', () => {
    mocks.walletInfo = makeWalletInfo({ isLoading: true })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('page-loading')).toBeInTheDocument()
  })

  it('disables operations while the wallet is rescanning', () => {
    setSession({ rescanning: true })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByRole('button', { name: 'scheduler.button_start' })).toBeDisabled()
  })

  it('shows the start waiting alert while the schedule start is pending', () => {
    mocks.startState = { isPending: true, isSuccess: false }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    // the key is shown both on the button and in the waiting alert title
    expect(screen.getAllByText('scheduler.button_start').length).toBeGreaterThan(1)
  })

  it('shows the stop waiting alert while the schedule stop is pending', () => {
    setSession({ coinjoin_in_process: true, schedule: activeSchedule })
    mocks.stopState = { isPending: true, isSuccess: false }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('schedule-progress:true')).toBeInTheDocument()
  })

  it('renders the schedule from the get-schedule query when no session schedule is set', () => {
    setSession({ coinjoin_in_process: true })
    mocks.scheduleQuery = { data: { schedule: activeSchedule } }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByText('schedule-progress:false')).toBeInTheDocument()
  })

  it('shows an alert when starting the schedule fails', async () => {
    mocks.runSchedule.mockRejectedValue(new Error('boom'))

    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'fill-destinations' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByText('global.error')).toBeInTheDocument()
  })

  it('shows an alert when stopping the schedule fails', async () => {
    setSession({ coinjoin_in_process: true, schedule: activeSchedule })
    mocks.stopScheduleRefetch.mockRejectedValue(new Error('stop-boom'))

    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'stop-sweep' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByText('global.error')).toBeInTheDocument()
  })

  it('does not store a schedule when the start result has no valid schedule', async () => {
    mocks.runSchedule.mockResolvedValue({ schedule: undefined } as unknown as { schedule: Schedule })

    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'fill-destinations' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

    await waitFor(() => expect(mocks.runSchedule).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('schedule-progress:false')).not.toBeInTheDocument()
  })

  describe('with insecure testing toggle enabled', () => {
    beforeEach(() => {
      mocks.debugFeatureEnabled = true
    })

    it('uses an existing new default-jar address when toggled on and submits tumbler options', async () => {
      mocks.walletInfo = makeWalletInfo({
        addressSummary: {
          [VALID_DESTINATIONS[0]]: {
            address: VALID_DESTINATIONS[0],
            status: 'new',
            jarIndex: 0,
          },
        } as unknown as WalletInfo['addressSummary'],
      })

      render(<SweepPage walletFileName="wallet.jmdat" />)

      fireEvent.click(screen.getByRole('switch'))
      await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled())

      fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
      fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

      await waitFor(() => expect(mocks.runSchedule).toHaveBeenCalledTimes(1))
      const callArgument = mocks.runSchedule.mock.calls[0][0] as { body: { tumbler_options?: unknown } }
      expect(callArgument.body.tumbler_options).toBeDefined()
    })

    it('falls back to any new address when no default-jar new address exists', () => {
      mocks.walletInfo = makeWalletInfo({
        addressSummary: {
          [VALID_DESTINATIONS[1]]: {
            address: VALID_DESTINATIONS[1],
            status: 'new',
            jarIndex: 2,
          },
        } as unknown as WalletInfo['addressSummary'],
      })

      render(<SweepPage walletFileName="wallet.jmdat" />)

      fireEvent.click(screen.getByRole('switch'))

      expect(screen.getByRole('switch')).toBeChecked()
    })

    it('uses an empty address when no new address is available', () => {
      render(<SweepPage walletFileName="wallet.jmdat" />)

      fireEvent.click(screen.getByRole('switch'))

      expect(screen.getByRole('switch')).toBeChecked()
    })

    it('restores production destinations when toggled off', () => {
      render(<SweepPage walletFileName="wallet.jmdat" />)

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)
      expect(toggle).toBeChecked()
      fireEvent.click(toggle)
      expect(toggle).not.toBeChecked()
    })
  })
})
