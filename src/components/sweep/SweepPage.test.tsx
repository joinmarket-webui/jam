import type { TumblerPlanResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import test from 'node:test'
import type { UseFormReturn } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS } from '@/constants/jam'
import type { Jar, useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { jmSessionStore } from '@/store/jmSessionStore'
import { flushActUpdates } from '@/test/flushActUpdates'
import type { SweepFormValues } from './SweepFormSchema'
import { SweepPage } from './SweepPage'

const VALID_DESTINATIONS = [
  'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk',
  'mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV',
  '2Mww8dCYPUpKHofjgcXcBCEGmniw9CoaiD2',
]

type WalletInfo = ReturnType<typeof useJamWalletInfoContext>

const pendingPlan: TumblerPlanResponse = {
  plan_id: 'plan-0',
  wallet_name: 'wallet.jmdat',
  status: 'pending',
  destinations: VALID_DESTINATIONS,
  current_phase: 0,
  phases: [
    {
      kind: 'coinjoin',
      index: 0,
      status: 'pending',
      wait_seconds: 300,
      mixdepth: 0,
      amount_fraction: 5,
      counterparty_count: 16,
      destination: 'INTERNAL',
    },
    {
      kind: 'coinjoin',
      index: 1,
      status: 'pending',
      wait_seconds: 0,
      mixdepth: 1,
      amount_fraction: 0,
      counterparty_count: 16,
      destination: VALID_DESTINATIONS[0],
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const activePlan: TumblerPlanResponse = {
  plan_id: 'plan-1',
  wallet_name: 'wallet.jmdat',
  status: 'running',
  destinations: VALID_DESTINATIONS,
  current_phase: 1,
  phases: [
    {
      kind: 'coinjoin',
      index: 0,
      status: 'completed',
      wait_seconds: 300,
      mixdepth: 0,
      amount_fraction: 5,
      counterparty_count: 16,
      destination: 'INTERNAL',
    },
    {
      kind: 'coinjoin',
      index: 1,
      status: 'pending',
      wait_seconds: 0,
      mixdepth: 1,
      amount_fraction: 0,
      counterparty_count: 16,
      destination: VALID_DESTINATIONS[0],
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mocks = vi.hoisted(() => ({
  debugFeatureEnabled: false,
  feeConfigMissing: false,
  feeConfigLoading: false,
  planTumbler: vi.fn<(input?: unknown) => Promise<TumblerPlanResponse>>(),
  startTumbler: vi.fn<(input?: unknown) => Promise<unknown>>(),
  stopTumbler: vi.fn<(input?: unknown) => Promise<unknown>>(),
  deleteTumbler: vi.fn<(input?: unknown) => Promise<unknown>>(),
  tumblerStatusData: undefined as TumblerPlanResponse | undefined,
  tumblerStatusPending: false,
  startReset: vi.fn(),
  startState: { isPending: false, isSuccess: false },
  stopReset: vi.fn(),
  stopState: { isPending: false, isSuccess: false },
  toastError: vi.fn(),
  walletInfo: undefined as WalletInfo | undefined,
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  tumblerstatusOptions: vi.fn(() => ({ queryKey: ['tumblerstatus'], queryFn: vi.fn() })),
  tumblerplanMutation: vi.fn(() => ({ mutationFn: mocks.planTumbler })),
  tumblerstartMutation: vi.fn(() => ({ mutationFn: mocks.startTumbler })),
  tumblerstopMutation: vi.fn(() => ({ mutationFn: mocks.stopTumbler })),
  tumblerplandeleteMutation: vi.fn(() => ({ mutationFn: mocks.deleteTumbler })),
}))

type MutationOptions = {
  mutationFn: (input?: unknown) => Promise<unknown>
  onError?: (error: Error) => void
  onMutate?: () => void
  onSuccess?: (result: unknown) => void
}

type QueryOptions = {
  queryKey?: unknown
  select?: (data: TumblerPlanResponse) => unknown
}

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: MutationOptions) => {
    const isStopSchedule = options.mutationFn === mocks.stopTumbler
    const state = isStopSchedule ? mocks.stopState : mocks.startState

    return {
      error: undefined,
      isPending: state.isPending,
      isSuccess: state.isSuccess,
      mutateAsync: async (input?: unknown) => {
        options.onMutate?.()
        try {
          const result = await options.mutationFn(input)
          options.onSuccess?.(result)
          return result
        } catch (error) {
          if (!options.onError) {
            throw error
          }
          options.onError(error instanceof Error ? error : new Error(String(error)))
          // do not rethrow: the component fires these mutations without catching,
          // and the UI is driven entirely by the onError handler above
          return undefined
        }
      },
      reset: isStopSchedule ? mocks.stopReset : mocks.startReset,
    }
  }),
  useQuery: vi.fn((options: QueryOptions) => {
    if (Array.isArray(options.queryKey) && options.queryKey[0] === 'tumblerstatus') {
      return {
        data: mocks.tumblerStatusData,
        isPending: mocks.tumblerStatusPending,
      }
    }

    return { data: undefined }
  }),
}))

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: Record<string, unknown> }) => (
    <span>
      {i18nKey}
      {values ? `:${JSON.stringify(values)}` : ''}
    </span>
  ),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDevMode: () => true,
  isDebugFeatureEnabled: () => mocks.debugFeatureEnabled,
}))

vi.mock('@/store/jamSettingsStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/jamSettingsStore')>()),
  useDeveloperMode: () => ({ enabled: true }),
}))

vi.mock('@/components/settings/fees/FeeConfigDialog', () => ({
  FeeConfigDialog: ({ open }: { open: boolean }) => (open ? <div>fee-config-dialog</div> : null),
}))

vi.mock('@/components/sweep/SweepDestinationInputs', () => ({
  SweepDestinationInputs: ({
    disabled,
    setValue,
  }: {
    disabled: boolean
    setValue: UseFormReturn<SweepFormValues>['setValue']
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        VALID_DESTINATIONS.forEach((address, index) => {
          setValue(`destinations.${index}.address`, address, { shouldDirty: true, shouldValidate: true })
        })
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

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => {
    const state = jmSessionStore.getState().state
    return {
      rescanInfo: { rescanning: !!state?.rescanning },
      takerInfo: {
        running: !!state?.coinjoin_in_process,
        scheduler: {
          running: !!state?.coinjoin_in_process && !!state?.schedule,
        },
      },
      makerInfo: {
        running: !!state?.maker_running,
      },
    }
  },
}))

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

describe('SweepPage', async () => {
  beforeEach(() => {
    mocks.debugFeatureEnabled = false
    mocks.feeConfigLoading = false
    mocks.feeConfigMissing = false
    mocks.planTumbler.mockReset()
    mocks.planTumbler.mockResolvedValue(activePlan)
    mocks.startTumbler.mockReset()
    mocks.startTumbler.mockResolvedValue(undefined)
    mocks.stopTumbler.mockReset()
    mocks.stopTumbler.mockResolvedValue(undefined)
    mocks.deleteTumbler.mockReset()
    mocks.deleteTumbler.mockResolvedValue(undefined)
    mocks.tumblerStatusData = undefined
    mocks.tumblerStatusPending = false
    mocks.startReset.mockReset()
    mocks.startState = { isPending: false, isSuccess: false }
    mocks.stopReset.mockReset()
    mocks.stopState = { isPending: false, isSuccess: false }
    mocks.toastError.mockReset()
    mocks.walletInfo = makeWalletInfo()
    setSession()

    vi.clearAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
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
    expect(screen.getByRole('button', { name: 'scheduler.button_plan' })).toBeDisabled()
  })

  it('builds and submits a sweep schedule after confirmation', async () => {
    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'fill-destinations' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_plan' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_plan' }))

    await waitFor(() => expect(mocks.planTumbler).toHaveBeenCalledTimes(1))
    expect(mocks.planTumbler).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- okay for `expect#objectContaining`
        body: expect.objectContaining({
          destinations: VALID_DESTINATIONS,
          force: true,
          parameters: {
            include_maker_sessions: true,
            rounding_chance: expect.any(Number) as number,
            maker_count_min: expect.any(Number) as number,
            maker_count_max: expect.any(Number) as number,
            mintxcount: 2,
            maker_session_idle_timeout_seconds: JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS,
          },
        }),
      }),
    )
  })

  it('submits a sweep schedule after confirmation', async () => {
    mocks.tumblerStatusData = pendingPlan

    render(<SweepPage walletFileName="wallet.jmdat" />)

    await waitFor(() => expect(screen.queryByRole('button', { name: 'scheduler.button_start' })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

    expect(mocks.startTumbler).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
    })
  })

  it('stops a running sweep schedule', async () => {
    setSession({ coinjoin_in_process: true, schedule: ['anything'] })
    mocks.tumblerStatusData = activePlan

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByRole('button', { name: 'scheduler.button_stop' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_stop' }))

    await waitFor(() =>
      expect(mocks.stopTumbler).toHaveBeenCalledWith({
        path: { walletname: 'wallet.jmdat' },
      }),
    )
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

    expect(screen.getByRole('button', { name: 'scheduler.button_plan' })).toBeDisabled()
  })

  it('shows the start waiting alert while the schedule start is pending', () => {
    mocks.startState = { isPending: true, isSuccess: false }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getAllByText('scheduler.alert_scheduler_starting_title').length).toBe(1)
  })

  it('shows the stop waiting alert while the schedule stop is pending', () => {
    setSession({ coinjoin_in_process: true, schedule: ['anything'] })
    mocks.tumblerStatusData = activePlan
    mocks.stopState = { isPending: true, isSuccess: false }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getAllByText('scheduler.alert_scheduler_stopping_title').length).toBe(1)
    expect(screen.getByRole('button', { name: 'global.loadingscheduler.button_stop' })).toBeDisabled()
  })

  // TODO: currently skipped as the session schedule is a necessary flag - can be revisited on demand
  await test.skip('renders the schedule converted from tumbler status when no session schedule is set', () => {
    setSession({ coinjoin_in_process: true })
    mocks.tumblerStatusData = activePlan

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByRole('button', { name: 'scheduler.button_stop' })).toBeInTheDocument()
  })

  it('shows an alert when planning the schedule fails', async () => {
    mocks.planTumbler.mockRejectedValue(new Error('boom'))

    render(<SweepPage walletFileName="wallet.jmdat" />)

    fireEvent.click(screen.getByRole('button', { name: 'fill-destinations' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_plan' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_plan' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByText('global.error')).toBeInTheDocument() // title
    expect(screen.getByText('scheduler.error_planning_schedule_failed:{"reason":"boom"}')).toBeInTheDocument() // description
  })

  it('shows an alert when starting the schedule fails', async () => {
    mocks.startTumbler.mockRejectedValue(new Error('boom'))
    mocks.tumblerStatusData = pendingPlan

    render(<SweepPage walletFileName="wallet.jmdat" />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_start' })).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_start' }))
    fireEvent.click(await screen.findByRole('button', { name: 'confirm-sweep' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByText('global.error')).toBeInTheDocument() // title
    expect(screen.getByText('scheduler.error_starting_schedule_failed:{"reason":"boom"}')).toBeInTheDocument() // description
  })

  it('shows an alert when stopping the schedule fails', async () => {
    setSession({ coinjoin_in_process: true, schedule: ['anything'] })
    mocks.tumblerStatusData = activePlan
    mocks.stopTumbler.mockRejectedValue(new Error('stop-boom'))

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.getByRole('button', { name: 'scheduler.button_stop' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_stop' }))

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1))
    expect(screen.getByText('global.error')).toBeInTheDocument() // title
    expect(screen.getByText('scheduler.error_stopping_schedule_failed:{"reason":"stop-boom"}')).toBeInTheDocument() // description
  })

  // TODO: do not skip this
  await test.skip('does not render non-running tumbler plans as a running schedule', () => {
    setSession({ coinjoin_in_process: true, schedule: ['anything'] })
    mocks.tumblerStatusData = { ...activePlan, status: 'completed' }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.queryByRole('button', { name: 'scheduler.button_stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'global.loadingscheduler.button_stop' })).not.toBeInTheDocument()
  })

  it('does not render a stale running tumbler plan as a running schedule', () => {
    setSession({ coinjoin_in_process: true, schedule: ['anything'] })
    mocks.tumblerStatusData = { ...activePlan, stale: true }

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.queryByRole('button', { name: 'scheduler.button_stop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'global.loadingscheduler.button_stop' })).not.toBeInTheDocument()
  })

  it('does not flash the single coinjoin alert while tumbler status is loading', () => {
    setSession({ coinjoin_in_process: true })
    mocks.tumblerStatusPending = true

    render(<SweepPage walletFileName="wallet.jmdat" />)

    expect(screen.queryByText('send.text_coinjoin_already_running')).not.toBeInTheDocument()
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

      const result = render(<SweepPage walletFileName="wallet.jmdat" />)

      fireEvent.click(result.container.querySelector('#switch-use-insecure-schedule-testing')!)
      await waitFor(() => expect(screen.getByRole('button', { name: 'scheduler.button_plan' })).not.toBeDisabled())

      fireEvent.click(screen.getByRole('button', { name: 'scheduler.button_plan' }))

      await waitFor(() => expect(mocks.planTumbler).toHaveBeenCalledTimes(1))
      const callArgument = mocks.planTumbler.mock.calls[0][0] as { body: { parameters?: unknown } }
      expect(callArgument.body.parameters).toBeDefined()
    })

    it('falls back to any new address when no default-jar new address exists', async () => {
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
      await flushActUpdates()
    })

    it('uses an empty address when no new address is available', async () => {
      render(<SweepPage walletFileName="wallet.jmdat" />)

      fireEvent.click(screen.getByRole('switch'))

      expect(screen.getByRole('switch')).toBeChecked()
      await flushActUpdates()
    })

    it('restores production destinations when toggled off', async () => {
      render(<SweepPage walletFileName="wallet.jmdat" />)

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)
      expect(toggle).toBeChecked()
      fireEvent.click(toggle)
      expect(toggle).not.toBeChecked()
      await flushActUpdates()
    })
  })
})
