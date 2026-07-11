import { useEffect, useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { tumblerstatusOptions, tumblerstopMutation } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import {
  tumblerplan,
  tumblerstart,
  type TumblerPhaseResponse,
  type TumblerPlanResponse,
} from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { HourglassIcon } from 'lucide-react'
import { useFieldArray, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { SweepDestinationInputs } from '@/components/sweep/SweepDestinationInputs'
import {
  buildSweepDestinationValues,
  getSweepDestinationAddresses,
  sweepFormSchema,
  type SweepResolverContext,
  type SweepFormValues,
} from '@/components/sweep/SweepFormSchema'
import { SweepPreconditionAlert } from '@/components/sweep/SweepPreconditionAlert'
import { SweepScheduleProgress } from '@/components/sweep/SweepScheduleProgress'
import { SweepStartConfirmDialog } from '@/components/sweep/SweepStartConfirmDialog'
import { buildSweepPreconditionSummary } from '@/components/sweep/preconditions'
import { isScheduleValue, type Schedule, type ScheduleEntry } from '@/components/sweep/scheduleUtils'
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
import { cn, type WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Spinner } from '../ui/spinner'

interface SweepPageProps {
  walletFileName: WalletFileName
}

const DESTINATION_ADDRESS_COUNT_PROD = 3
const DESTINATION_ADDRESS_COUNT_TEST = 1
const WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL = 3_000
const WAIT_FOR_UPDATE_SESSION_POLLING_DELAY = 1_000
const INSECURE_SCHEDULE_TUMBLER_OPTIONS = {
  addrcount: DESTINATION_ADDRESS_COUNT_TEST,
  minmakercount: 1,
  makercountrange: [1, 0],
  mixdepthcount: DESTINATION_ADDRESS_COUNT_TEST,
  mintxcount: 1,
  txcountparams: [1, 0],
  timelambda: 0.025,
  stage1_timelambda_increase: 1,
  liquiditywait: 13,
  waittime: 0,
}

const getNewTestingDestinationAddress = (addressSummary: AddressSummary): string => {
  const newAddressFromDefaultJar =
    Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new' && addressMeta.jarIndex === 0)
      ?.address ?? ''
  if (newAddressFromDefaultJar !== '') {
    return newAddressFromDefaultJar
  }

  return Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new')?.address ?? ''
}

const isPhaseComplete = (phase: TumblerPhaseResponse): boolean => {
  return phase.status.toLowerCase() === 'completed'
}

const toScheduleStateFlag = (phase: TumblerPhaseResponse): ScheduleEntry[6] => {
  if (isPhaseComplete(phase)) {
    return 1
  }
  return phase.txid ?? 0
}

const toSchedule = (plan: TumblerPlanResponse): Schedule => {
  return plan.phases.map(
    (phase) =>
      [
        phase.mixdepth ?? 0,
        phase.amount_fraction ?? 0,
        phase.counterparty_count ?? 0,
        phase.destination ?? 'INTERNAL',
        (phase.wait_seconds ?? 0) / 60,
        0,
        toScheduleStateFlag(phase),
      ] as ScheduleEntry,
  )
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const walletInfo = useJamWalletInfoContext()

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showScheduleConfirmDialog, setShowScheduleConfirmDialog] = useState<SweepFormValues>()
  const [alertMessage, setAlertMessage] = useState<string>()

  const feeConfigValidation = useFeeConfigValidation({ walletFileName })

  const allUtxos = useMemo(() => {
    return walletInfo.jars.flatMap((jar) => jar.utxos)
  }, [walletInfo.jars])

  const preconditionSummary = useMemo(() => {
    return buildSweepPreconditionSummary(allUtxos)
  }, [allUtxos])

  const getScheduleQuery = useQuery({
    ...tumblerstatusOptions({
      client,
      path: { walletname: walletFileName },
    }),
    enabled: jmSession?.coinjoin_in_process === true,
    refetchInterval: jmSession?.coinjoin_in_process === true ? WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL : false,
    refetchIntervalInBackground: true,
    retry: false,
    select: (data: TumblerPlanResponse): { schedule: Schedule } | null => {
      if (data.status.toLowerCase() !== 'running' || data.stale === true) {
        return null
      }

      return { schedule: toSchedule(data) }
    },
  })

  /*const planSchedule = useMutation({
    ...tumblerplanMutation({ client }),
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onError: (error) => {
      console.error('Plan schedule error:', error)
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('scheduler.error_planning_schedule_failed', { reason }))
    },
  })*/

  const {
    isPending: startScheduleMutationIsPending,
    isSuccess: startScheduleMutationIsSuccess,
    reset: startScheduleMutationReset,
    mutateAsync: startScheduleMutationMutateAsync,
  } = useMutation({
    mutationFn: async (args: {
      path: { walletname: WalletFileName }
      body: { destinations: string[]; parameters?: typeof INSECURE_SCHEDULE_TUMBLER_OPTIONS }
    }) => {
      await tumblerplan({
        client,
        path: args.path,
        body: {
          destinations: args.body.destinations,
          parameters: args.body.parameters,
          force: true,
        },
        throwOnError: true,
      })

      return await tumblerstart({
        client,
        path: args.path,
        throwOnError: true,
      })
    },
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onSuccess: () => {
      setShowScheduleConfirmDialog(undefined)
    },
    onError: (error: unknown) => {
      setShowScheduleConfirmDialog(undefined)
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
    ...tumblerstopMutation({ client }),
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

  const currentSchedule = isScheduleValue(getScheduleQuery.data?.schedule) ? getScheduleQuery.data.schedule : undefined

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

    const body = {
      destinations: getSweepDestinationAddresses(showScheduleConfirmDialog),
      ...(showScheduleConfirmDialog.useInsecureTestingSettings
        ? { parameters: INSECURE_SCHEDULE_TUMBLER_OPTIONS }
        : {}),
    }

    await startScheduleMutationMutateAsync({
      path: { walletname: walletFileName },
      body,
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
          <SweepScheduleProgress schedule={currentSchedule} isStopping={isWaitingSchedulerStop} onStop={stopSchedule} />
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

                <PlanSweepForm
                  className=""
                  addressSummary={walletInfo.addressSummary}
                  disabled={isOperationDisabled || isWaitingSchedulerStart || isWaitingSchedulerStop}
                  onSubmit={(values) => {
                    setShowScheduleConfirmDialog(values)
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

interface PlanSweepFormProps {
  className?: string
  onSubmit: SubmitHandler<SweepFormValues>
  addressSummary: AddressSummary
  disabled?: boolean
  debug?: boolean
}

const PlanSweepForm = ({ className, onSubmit, addressSummary, disabled }: PlanSweepFormProps) => {
  const { t } = useTranslation()

  const showInsecureScheduleTestingToggle = isDebugFeatureEnabled('insecureScheduleTesting')

  const schema = useMemo(() => sweepFormSchema(addressSummary, t), [addressSummary, t])
  const initialDestinations = useMemo(() => buildSweepDestinationValues(DESTINATION_ADDRESS_COUNT_PROD), [])
  const { formState, register, control, setValue, handleSubmit } = useForm<
    SweepFormValues,
    SweepResolverContext,
    SweepFormValues
  >({
    mode: 'onChange',
    defaultValues: {
      destinations: initialDestinations,
    },
    resolver: yupResolver(schema),
  })

  const watchedUseInsecureTestSettings = useWatch({ control, name: 'useInsecureTestingSettings' })
  const { fields, replace } = useFieldArray({ control, name: 'destinations' })

  const onInsecureTestingToggleChange = (checked: boolean) => {
    setValue('useInsecureTestingSettings', checked)

    if (checked) {
      replace([{ address: getNewTestingDestinationAddress(addressSummary) }])
    } else {
      replace(buildSweepDestinationValues(DESTINATION_ADDRESS_COUNT_PROD))
    }
  }

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      {showInsecureScheduleTestingToggle && (
        <div className="flex items-center gap-2">
          <Switch
            id="switch-use-insecure-schedule-testing"
            checked={watchedUseInsecureTestSettings ?? false}
            onCheckedChange={onInsecureTestingToggleChange}
            disabled={disabled}
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
        register={register}
        setValue={setValue}
        formState={formState}
        fields={fields}
        disabled={disabled}
      />

      <p className="text-muted-foreground text-sm">{t('scheduler.description_fees')}</p>

      <Button type="submit" disabled={disabled || formState.isSubmitting} className="w-full" size="xxl">
        {formState.isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('scheduler.button_start')}
          </>
        ) : (
          t('scheduler.button_start')
        )}
      </Button>
    </form>
  )
}
