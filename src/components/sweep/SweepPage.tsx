import { useEffect, useMemo, useState } from 'react'
import {
  tumblerplandeleteMutation,
  tumblerplanMutation,
  tumblerstartMutation,
  tumblerstopMutation,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { tumblerstatus, type TumblerPlanRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HourglassIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { SweepDestinationInputs } from '@/components/sweep/SweepDestinationInputs'
import { SweepPreconditionAlert } from '@/components/sweep/SweepPreconditionAlert'
import { SweepScheduleProgress } from '@/components/sweep/SweepScheduleProgress'
import { SweepStartConfirmDialog } from '@/components/sweep/SweepStartConfirmDialog'
import { buildDestinationErrors, normalizeDestinationAddresses } from '@/components/sweep/destinationValidation'
import { buildSweepPreconditionSummary } from '@/components/sweep/preconditions'
import { isScheduleValue, type Schedule } from '@/components/sweep/scheduleUtils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Balance } from '@/components/ui/jam/Balance'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { useJamWalletInfoContext, type AddressSummary } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { getErrorReason } from '@/lib/errorReason'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Spinner } from '../ui/spinner'

interface SweepPageProps {
  walletFileName: WalletFileName
}

const DESTINATION_ADDRESS_COUNT_PROD = 3
const DESTINATION_ADDRESS_COUNT_TEST = 1
const STATUS_POLLING_INTERVAL = 3_000
const SESSION_POLLING_DELAY = 1_000

// Fast/insecure parameters for regtest debugging. These target jm-ng's current
// ``TumbleParameters`` field names directly so the dev sweep flow can exercise
// the live backend without legacy payload translation.
const INSECURE_TUMBLER_PARAMETERS: Record<string, unknown> = {
  maker_count_min: 1,
  maker_count_max: 1,
  mintxcount: 1,
  time_lambda_seconds: 0.025,
  include_maker_sessions: false,
  include_bondless_bursts: false,
}

// Plan statuses for which the runner has already finished and the user is
// looking at a historical record. Polling can stop and the UI may offer to
// clear the plan to start a fresh one.
const TERMINAL_PLAN_STATUSES = new Set(['completed', 'failed', 'cancelled'])

const initialDestinationAddresses = (count: number) => Array.from({ length: count }, () => '')
const initialTouchedValues = (count: number) => Array.from({ length: count }, () => false)

const getNewTestingDestinationAddress = (addressSummary: AddressSummary): string => {
  const newAddressFromDefaultJar =
    Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new' && addressMeta.jarIndex === 0)
      ?.address ?? ''
  if (newAddressFromDefaultJar !== '') {
    return newAddressFromDefaultJar
  }

  return Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new')?.address ?? ''
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const queryClient = useQueryClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const walletInfo = useJamWalletInfoContext()

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showScheduleConfirmDialog, setShowScheduleConfirmDialog] = useState(false)
  const [destinationAddresses, setDestinationAddresses] = useState(() =>
    initialDestinationAddresses(DESTINATION_ADDRESS_COUNT_PROD),
  )
  const [destinationTouched, setDestinationTouched] = useState(() =>
    initialTouchedValues(DESTINATION_ADDRESS_COUNT_PROD),
  )
  const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string>()
  const showInsecureScheduleTestingToggle = isDebugFeatureEnabled('insecureScheduleTesting')

  const { maxFeesConfigMissing, isLoading } = useFeeConfigValidation({ walletFileName })
  const allUtxos = useMemo(() => {
    return walletInfo.jars.flatMap((jar) => jar.utxos)
  }, [walletInfo.jars])

  const preconditionSummary = useMemo(() => {
    return buildSweepPreconditionSummary(allUtxos)
  }, [allUtxos])

  const destinationErrors = useMemo(() => {
    return buildDestinationErrors(destinationAddresses, walletInfo.addressSummary, t)
  }, [destinationAddresses, walletInfo.addressSummary, t])

  const normalizedDestinationAddresses = useMemo(() => {
    return normalizeDestinationAddresses(destinationAddresses)
  }, [destinationAddresses])

  const hasDestinationErrors = destinationErrors.some((error) => error !== undefined)
  const allDestinationAddressesPresent = normalizedDestinationAddresses.every((address) => address !== '')

  const coinjoinInProcess = jmSession?.coinjoin_in_process === true

  // Poll ``/tumbler/status`` whenever a tumble might be in flight. The query
  // also runs once on mount so a stale terminal plan is surfaced even before
  // the session reports an active coinjoin.
  const tumblerStatusQuery = useQuery({
    queryKey: ['tumbler-status', walletFileName],
    enabled: jmSession !== undefined,
    retry: false,
    refetchInterval: coinjoinInProcess ? STATUS_POLLING_INTERVAL : false,
    refetchIntervalInBackground: true,
    queryFn: async ({ signal }) => {
      const result = await tumblerstatus({
        client,
        signal,
        path: { walletname: walletFileName },
        throwOnError: false,
      })

      if (result.error !== undefined) {
        // 404 simply means there is no plan on disk yet; treat as "no schedule".
        if (result.response.status === 404) {
          return null
        }
        throw new Error(getErrorReason(result.error, 'Failed to load tumbler status'))
      }

      return result.data ?? null
    },
  })

  const planFromStatus: Schedule | undefined = isScheduleValue(tumblerStatusQuery.data)
    ? tumblerStatusQuery.data
    : undefined

  const planStatus = planFromStatus?.status
  const planIsTerminal = planStatus !== undefined && TERMINAL_PLAN_STATUSES.has(planStatus)
  const planIsRunning = planStatus === 'running'
  const planIsPending = planStatus === 'pending'

  // ``coinjoin_in_process`` from the session is the canonical "tumble in
  // progress" signal. The plan status is used as a UX hint (e.g. to keep the
  // progress card visible during the gap between user-stop and the runner
  // reaching a terminal state).
  const schedulerRunning = coinjoinInProcess || planIsRunning

  const singleCoinJoinRunning = coinjoinInProcess && planFromStatus === undefined
  const makerRunning = jmSession?.maker_running === true
  const collaborativeOperationRunning = makerRunning || coinjoinInProcess

  const planMutation = useMutation({
    ...tumblerplanMutation({ client }),
    retry: false,
    onMutate: () => setAlertMessage(undefined),
  })

  const startMutation = useMutation({
    ...tumblerstartMutation({ client }),
    retry: false,
    onMutate: () => setAlertMessage(undefined),
  })

  const stopMutation = useMutation({
    ...tumblerstopMutation({ client }),
    retry: false,
    onMutate: () => setAlertMessage(undefined),
  })

  const deletePlanMutation = useMutation({
    ...tumblerplandeleteMutation({ client }),
    retry: false,
  })

  const isWaitingSchedulerStart =
    planMutation.isPending || startMutation.isPending || (startMutation.isSuccess && !coinjoinInProcess)
  const isWaitingSchedulerStop = stopMutation.isPending || (stopMutation.isSuccess && coinjoinInProcess)

  useRefreshSession({
    enabled: isWaitingSchedulerStart || isWaitingSchedulerStop,
    refetchInterval: STATUS_POLLING_INTERVAL,
    refetchDelay: SESSION_POLLING_DELAY,
  })

  // Reset success flags so the start/stop spinner doesn't get stuck once the
  // session/plan transitions catch up with the user's intent.
  const startMutationIsSuccess = startMutation.isSuccess
  const startMutationReset = startMutation.reset
  useEffect(() => {
    if (coinjoinInProcess && startMutationIsSuccess) {
      startMutationReset()
    }
  }, [coinjoinInProcess, startMutationIsSuccess, startMutationReset])

  const stopMutationIsSuccess = stopMutation.isSuccess
  const stopMutationReset = stopMutation.reset
  useEffect(() => {
    if (!coinjoinInProcess && stopMutationIsSuccess) {
      stopMutationReset()
    }
  }, [coinjoinInProcess, stopMutationIsSuccess, stopMutationReset])

  const isOperationDisabled =
    maxFeesConfigMissing ||
    collaborativeOperationRunning ||
    jmSession?.rescanning === true ||
    !preconditionSummary.isFulfilled

  const isStartDisabled =
    isOperationDisabled ||
    isWaitingSchedulerStart ||
    isWaitingSchedulerStop ||
    hasDestinationErrors ||
    !allDestinationAddressesPresent

  const touchAllDestinations = () => {
    setDestinationTouched((current) => current.map(() => true))
  }

  const onInsecureTestingToggleChange = (checked: boolean) => {
    setUseInsecureTestingSettings(checked)

    if (checked) {
      setDestinationAddresses([getNewTestingDestinationAddress(walletInfo.addressSummary)])
      setDestinationTouched(initialTouchedValues(DESTINATION_ADDRESS_COUNT_TEST))
      return
    }

    setDestinationAddresses(initialDestinationAddresses(DESTINATION_ADDRESS_COUNT_PROD))
    setDestinationTouched(initialTouchedValues(DESTINATION_ADDRESS_COUNT_PROD))
  }

  const updateDestinationAddress = (index: number, value: string) => {
    setDestinationAddresses((current) =>
      current.map((address, currentIndex) => (currentIndex === index ? value : address)),
    )
  }

  const markDestinationTouched = (index: number) => {
    setDestinationTouched((current) =>
      current.map((touched, currentIndex) => (currentIndex === index ? true : touched)),
    )
  }

  const refetchTumblerStatus = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tumbler-status', walletFileName] })
  }

  const startSchedule = async () => {
    touchAllDestinations()
    if (isStartDisabled) {
      return
    }

    const body: TumblerPlanRequest = {
      destinations: normalizeDestinationAddresses(destinationAddresses),
      // Always pass ``force=true``: the backend rejects overwrites of in-flight
      // plans regardless, but a leftover PENDING plan from a previous attempt
      // would otherwise block the user with no in-UI escape hatch.
      force: true,
      ...(showInsecureScheduleTestingToggle && useInsecureTestingSettings
        ? { parameters: INSECURE_TUMBLER_PARAMETERS }
        : {}),
    }

    try {
      await planMutation.mutateAsync({
        path: { walletname: walletFileName },
        body,
      })
      await startMutation.mutateAsync({
        path: { walletname: walletFileName },
      })
      setShowScheduleConfirmDialog(false)
      await refetchTumblerStatus()
    } catch (error) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = `${t('scheduler.error_starting_schedule_failed')} ${reason}`
      setAlertMessage(message)
      toast.error(message)
    }
  }

  const onOpenScheduleConfirm = () => {
    touchAllDestinations()
    if (isStartDisabled) {
      return
    }
    setShowScheduleConfirmDialog(true)
  }

  const stopSchedule = async () => {
    try {
      await stopMutation.mutateAsync({
        path: { walletname: walletFileName },
      })
      await refetchTumblerStatus()
    } catch (error) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = `${t('scheduler.error_stopping_schedule_failed')} ${reason}`
      setAlertMessage(message)
      toast.error(message)
    }
  }

  const dismissTerminalPlan = async () => {
    try {
      await deletePlanMutation.mutateAsync({
        path: { walletname: walletFileName },
      })
      await refetchTumblerStatus()
    } catch (error) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(`${t('scheduler.error_dismissing_plan_failed')} ${reason}`)
    }
  }

  if (isLoading || walletInfo.isLoading || jmSession === undefined) {
    return <PageLoading />
  }

  // Treat the page as "showing the run" whenever there's a plan to display,
  // even if the runner has already finished -- the user should see the final
  // outcome instead of being thrown back to the start form.
  const showProgressCard = planFromStatus !== undefined && (schedulerRunning || planIsTerminal)

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
      <SweepStartConfirmDialog
        open={showScheduleConfirmDialog}
        onOpenChange={setShowScheduleConfirmDialog}
        onConfirm={startSchedule}
        disabled={isStartDisabled || isWaitingSchedulerStart}
        isStarting={isWaitingSchedulerStart}
      />

      <PageTitle title={t('scheduler.title')} subtitle={t('scheduler.subtitle')} />

      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      {alertMessage && (
        <Alert variant="destructive">
          <AlertTitle>{t('global.error')}</AlertTitle>
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      {singleCoinJoinRunning && (
        <Alert variant="warning">
          <HourglassIcon />
          <AlertDescription>{t('send.text_coinjoin_already_running')}</AlertDescription>
        </Alert>
      )}

      {makerRunning && !schedulerRunning && (
        <Alert variant="warning">
          <HourglassIcon />
          <AlertDescription>{t('send.text_maker_running')}</AlertDescription>
        </Alert>
      )}

      {isWaitingSchedulerStart && (
        <Alert>
          <Spinner className="motion-reduce:hidden" />
          <AlertTitle>{t('scheduler.button_start')}</AlertTitle>
        </Alert>
      )}

      {isWaitingSchedulerStop && (
        <Alert>
          <Spinner className="motion-reduce:hidden" />
          <AlertTitle>{t('scheduler.button_stop')}</AlertTitle>
        </Alert>
      )}

      {showProgressCard && planFromStatus !== undefined && (
        <SweepScheduleProgress
          schedule={planFromStatus}
          isStopping={isWaitingSchedulerStop}
          onStop={stopSchedule}
        />
      )}

      {planIsPending && !schedulerRunning && (
        <Alert>
          <AlertTitle>Pending sweep plan</AlertTitle>
          <AlertDescription>
            A sweep plan exists for this wallet but is not currently running. Start it to continue, or create a new plan to
            replace it.
          </AlertDescription>
        </Alert>
      )}

      {planIsTerminal && planFromStatus !== undefined && (
        <Alert variant={planStatus === 'completed' ? 'success' : 'destructive'}>
          <AlertTitle>
            {planStatus === 'completed'
              ? t('scheduler.terminal_completed')
              : planStatus === 'cancelled'
                ? t('scheduler.terminal_cancelled')
                : t('scheduler.terminal_failed')}
          </AlertTitle>
          {planFromStatus.error && <AlertDescription>{planFromStatus.error}</AlertDescription>}
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void dismissTerminalPlan()}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? (
                <>
                  <Spinner className="motion-reduce:hidden" />
                  {t('scheduler.button_dismiss_plan')}
                </>
              ) : (
                t('scheduler.button_dismiss_plan')
              )}
            </Button>
          </div>
        </Alert>
      )}

      {!schedulerRunning && !planIsTerminal && (
        <>
          <SweepPreconditionAlert summary={preconditionSummary} />

          <Card>
            <CardContent className="space-y-5">
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <div className="font-medium">{t('scheduler.complete_wallet_title')}</div>
                  <div className="text-muted-foreground text-sm">{t('scheduler.complete_wallet_subtitle')}</div>
                </div>
                <div className="font-semibold">
                  <Balance valueString={String(walletInfo.walletBalanceSummary.calculatedAvailableBalanceInSats)} />
                </div>
              </div>

              <p className="text-muted-foreground text-sm">{t('scheduler.description_destination_addresses')}</p>

              {showInsecureScheduleTestingToggle && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-use-insecure-schedule-testing"
                    checked={useInsecureTestingSettings}
                    onCheckedChange={onInsecureTestingToggleChange}
                    disabled={isOperationDisabled || isWaitingSchedulerStart || isWaitingSchedulerStop}
                  />
                  <Label htmlFor="switch-use-insecure-schedule-testing" className="flex flex-col items-start gap-0">
                    <div className="flex items-center gap-2 font-medium">
                      Use insecure testing settings
                      <DevBadge />
                    </div>
                    <div className="text-muted-foreground text-sm">
                      This is completely insecure but makes testing the schedule much faster.
                    </div>
                  </Label>
                </div>
              )}

              <SweepDestinationInputs
                addresses={destinationAddresses}
                errors={destinationErrors}
                touched={destinationTouched}
                disabled={isOperationDisabled || isWaitingSchedulerStart || isWaitingSchedulerStop}
                onChange={updateDestinationAddress}
                onBlur={markDestinationTouched}
              />

              <p className="text-muted-foreground text-sm">{t('scheduler.description_fees')}</p>

              <Button
                type="button"
                onClick={onOpenScheduleConfirm}
                disabled={isStartDisabled}
                size="xxl"
                className="w-full"
              >
                {isWaitingSchedulerStart ? (
                  <>
                    <Spinner className="motion-reduce:hidden" />
                    {t('scheduler.button_start')}
                  </>
                ) : (
                  t('scheduler.button_start')
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
