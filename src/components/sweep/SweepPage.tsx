import { useEffect, useMemo, useState } from 'react'
import {
  tumblerplanMutation,
  tumblerstartMutation,
  tumblerstatusOptions,
  tumblerstopMutation,
} from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type {
  TumblerPhaseResponse,
  TumblerPlanRequest,
  TumblerPlanResponse,
} from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { HourglassIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { SweepPreconditionAlert } from '@/components/sweep/SweepPreconditionAlert'
import { SweepScheduleProgress } from '@/components/sweep/SweepScheduleProgress'
import { SweepStartConfirmDialog } from '@/components/sweep/SweepStartConfirmDialog'
import { buildSweepPreconditionSummary } from '@/components/sweep/preconditions'
import type { Schedule, ScheduleEntry } from '@/components/sweep/scheduleUtils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Balance } from '@/components/ui/jam/Balance'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { TumblerParameters } from '@/constants/jm'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { getErrorReason } from '@/lib/errorReason'
import { percentageToFactor, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Spinner } from '../ui/spinner'
import { SweepForm } from './SweepForm'

interface SweepPageProps {
  walletFileName: WalletFileName
}

const WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL = 3_000
const WAIT_FOR_UPDATE_SESSION_POLLING_DELAY = 1_000

const INSECURE_SCHEDULE_TUMBLER_OPTIONS: Partial<TumblerParameters> = {
  maker_count_min: 1,
  maker_count_max: 2,
  time_lambda_seconds: 10,
  stage1_wait_multiplier: 1.5,
  maker_session_idle_timeout_seconds: 60,
  mincjamount_sats: 1,
  mintxcount: 1,
}

const isPhaseComplete = (phase: TumblerPhaseResponse): boolean => {
  return phase.status.toLowerCase() === 'completed'
}

const toScheduleStateFlag = (phase: TumblerPhaseResponse): ScheduleEntry['stateFlag'] => {
  if (isPhaseComplete(phase)) {
    return 1
  }
  return phase.txid ?? 0
}

const toSchedule = (plan: TumblerPlanResponse): Schedule => {
  return plan.phases.map((phase) => ({
    jarIndex: phase.mixdepth ?? 0,
    amountFraction: phase.amount_fraction ?? 0,
    numberOfRequestedCounterparties: phase.counterparty_count ?? 0,
    destinationOrInternal: phase.destination ?? 'INTERNAL',
    waitTimeInSeconds: phase.wait_seconds ?? 0,
    rounding: 0,
    stateFlag: toScheduleStateFlag(phase),
  }))
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const walletInfo = useJamWalletInfoContext()
  const { enabled: isDeveloperMode } = useDeveloperMode()

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showScheduleConfirmDialog, setShowScheduleConfirmDialog] = useState<TumblerPlanRequest>()
  const [alertMessage, setAlertMessage] = useState<string>()

  const feeConfigValidation = useFeeConfigValidation({ walletFileName })

  const preconditionSummary = useMemo(() => {
    const allUtxos = walletInfo.jars.flatMap((jar) => jar.utxos)
    return buildSweepPreconditionSummary(allUtxos)
  }, [walletInfo.jars])

  const getScheduleQuery = useQuery({
    ...tumblerstatusOptions({
      client,
      path: { walletname: walletFileName },
    }),
    refetchInterval: jmSession?.coinjoin_in_process === true ? WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL : false,
    refetchIntervalInBackground: true,
    retry: false,
  })

  const planSchedule = useMutation({
    ...tumblerplanMutation({ client }),
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onSuccess: (data) => {
      setShowScheduleConfirmDialog(data)
    },
    onError: (error) => {
      console.error('Plan schedule error:', error)

      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('scheduler.error_starting_schedule_failed', { reason })
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const {
    isPending: startScheduleMutationIsPending,
    isSuccess: startScheduleMutationIsSuccess,
    reset: startScheduleMutationReset,
    mutateAsync: startScheduleMutationMutateAsync,
  } = useMutation({
    ...tumblerstartMutation({
      client,
    }),
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onSettled: () => {
      setShowScheduleConfirmDialog(undefined)
    },
    onError: (error) => {
      console.error('Plan schedule error:', error)
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('scheduler.error_starting_schedule_failed', { reason })
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const {
    isPending: stopScheduleMutationIsPending,
    isSuccess: stopScheduleMutationIsSuccess,
    mutateAsync: stopScheduleMutationMutateAsync,
    reset: stopScheduleMutationReset,
  } = useMutation({
    ...tumblerstopMutation({
      client,
      path: { walletname: walletFileName },
    }),
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onError: (error) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('scheduler.error_stopping_schedule_failed', { reason })
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const currentSchedule = useMemo(() => {
    if (getScheduleQuery.data === undefined) return
    if (getScheduleQuery.data.stale === true) return
    if (getScheduleQuery.data.status.toLowerCase() !== 'running') return

    return toSchedule(getScheduleQuery.data)
  }, [getScheduleQuery.data])

  const schedulerRunning = jmSession?.coinjoin_in_process === true && currentSchedule !== undefined
  const isWaitingSchedulerStart =
    startScheduleMutationIsPending || (startScheduleMutationIsSuccess && !schedulerRunning)
  const waitingForTumblerStatus = jmSession?.coinjoin_in_process === true && getScheduleQuery.isPending
  const singleCoinJoinRunning =
    jmSession?.coinjoin_in_process === true && !schedulerRunning && !isWaitingSchedulerStart && !waitingForTumblerStatus
  const makerRunning = jmSession?.maker_running === true
  const collaborativeOperationRunning = makerRunning || jmSession?.coinjoin_in_process === true

  const isWaitingSchedulerStop = stopScheduleMutationIsPending || (stopScheduleMutationIsSuccess && schedulerRunning)

  useRefreshSession({
    enabled: isWaitingSchedulerStart || isWaitingSchedulerStop,
    refetchInterval: WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL,
    refetchDelay: WAIT_FOR_UPDATE_SESSION_POLLING_DELAY,
  })

  useEffect(() => {
    if (schedulerRunning && startScheduleMutationIsSuccess) {
      startScheduleMutationReset()
    }
  }, [schedulerRunning, startScheduleMutationIsSuccess, startScheduleMutationReset])

  useEffect(() => {
    if (!schedulerRunning && stopScheduleMutationIsSuccess) {
      stopScheduleMutationReset()
    }
  }, [schedulerRunning, stopScheduleMutationIsSuccess, stopScheduleMutationReset])

  const isOperationDisabled =
    feeConfigValidation.maxFeesConfigMissing ||
    collaborativeOperationRunning ||
    jmSession?.rescanning ||
    !preconditionSummary.isFulfilled

  const isStartDisabled = isOperationDisabled || isWaitingSchedulerStart || isWaitingSchedulerStop

  const startSchedule = async () => {
    if (showScheduleConfirmDialog === undefined) return

    await startScheduleMutationMutateAsync({
      path: { walletname: walletFileName },
    })
  }

  const stopSchedule = async () => {
    await stopScheduleMutationMutateAsync({
      path: { walletname: walletFileName },
    })
  }

  if (!jmSession || feeConfigValidation.isLoading || walletInfo.isLoading) {
    return <PageLoading />
  }

  return (
    <>
      <FeeConfigDialog
        walletFileName={walletFileName}
        feeConfigValidation={feeConfigValidation}
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
      />
      <SweepStartConfirmDialog
        open={showScheduleConfirmDialog !== undefined}
        onOpenChange={() => setShowScheduleConfirmDialog(undefined)}
        onConfirm={startSchedule}
        disabled={isStartDisabled || isWaitingSchedulerStart}
        isStarting={isWaitingSchedulerStart}
      />
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <PageTitle title={t('scheduler.title')} subtitle={t('scheduler.subtitle')} />

        {feeConfigValidation.maxFeesConfigMissing && (
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
            <HourglassIcon className="motion-safe:animate-pulse" />
            <AlertDescription>{t('send.text_coinjoin_already_running')}</AlertDescription>
          </Alert>
        )}

        {makerRunning && (
          <Alert variant="warning">
            <HourglassIcon className="motion-safe:animate-pulse" />
            <AlertDescription>{t('send.text_maker_running')}</AlertDescription>
          </Alert>
        )}

        {isWaitingSchedulerStart && (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('scheduler.alert_scheduler_starting_title')}</AlertTitle>
          </Alert>
        )}

        {isWaitingSchedulerStop && (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('scheduler.alert_scheduler_stopping_title')}</AlertTitle>
          </Alert>
        )}

        {schedulerRunning && currentSchedule && (
          <SweepScheduleProgress
            schedule={currentSchedule}
            isStopping={isWaitingSchedulerStop}
            onStop={stopSchedule}
            debug={isDeveloperMode}
          />
        )}

        {!schedulerRunning && (
          <>
            <SweepPreconditionAlert summary={preconditionSummary} />

            <Card>
              <CardContent className="space-y-5">
                <div className="bg-muted/50 flex flex-col items-start justify-between gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="font-medium">{t('scheduler.complete_wallet_title')}</div>
                    <div className="text-muted-foreground text-sm">{t('scheduler.complete_wallet_subtitle')}</div>
                  </div>
                  <div className="shrink-0 font-semibold">
                    <Balance valueString={String(walletInfo.walletBalanceSummary.calculatedAvailableBalanceInSats)} />
                  </div>
                </div>

                <p className="text-muted-foreground text-sm">{t('scheduler.description_destination_addresses')}</p>

                <SweepForm
                  addressSummary={walletInfo.addressSummary}
                  disabled={isOperationDisabled || isWaitingSchedulerStart || isWaitingSchedulerStop}
                  debug={isDeveloperMode}
                  onSubmit={async (values) => {
                    const parameters: Partial<TumblerParameters> = {
                      include_maker_sessions: values.includeMakerSessions,
                      maker_count_min: values.minNumberOfCollaborators,
                      maker_count_max: values.maxNumberOfCollaborators,
                      rounding_chance: percentageToFactor(values.roundingChanceInPercent, 2),
                      ...(values.useInsecureTestingSettings ? { ...INSECURE_SCHEDULE_TUMBLER_OPTIONS } : {}),
                    }
                    const body: TumblerPlanRequest = {
                      force: true,
                      destinations: values.destinations.map((it) => it.address),
                      parameters,
                    }

                    await planSchedule.mutateAsync({
                      path: { walletname: walletFileName },
                      body,
                    })
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}

        {isDeveloperMode && (
          <Card className="mt-8">
            <CardHeader className="grid">
              <DevBadge className="justify-self-end" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-scroll">
                <code className="text-destructive">getScheduleQuery.data:</code>
                <pre className="text-xs">{JSON.stringify(getScheduleQuery.data, null, 2)}</pre>
              </div>
              <div className="overflow-scroll">
                <code className="text-destructive">planSchedule.data:</code>
                <pre className="text-xs">{JSON.stringify(planSchedule.data, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
