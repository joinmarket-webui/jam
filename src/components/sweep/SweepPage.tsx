import { useEffect, useMemo, useState } from 'react'
import { runscheduleMutation, stopcoinjoinOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { getschedule, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { HourglassIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
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
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
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

const DESTINATION_ADDRESS_COUNT = 3
const WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL = 3_000
const WAIT_FOR_UPDATE_SESSION_POLLING_DELAY = 1_000

const initialDestinationAddresses = () => Array.from({ length: DESTINATION_ADDRESS_COUNT }, () => '')
const initialTouchedValues = () => Array.from({ length: DESTINATION_ADDRESS_COUNT }, () => false)

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const walletInfo = useJamWalletInfoContext()

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showScheduleConfirmDialog, setShowScheduleConfirmDialog] = useState(false)
  const [destinationAddresses, setDestinationAddresses] = useState(initialDestinationAddresses)
  const [destinationTouched, setDestinationTouched] = useState(initialTouchedValues)
  const [alertMessage, setAlertMessage] = useState<string>()
  const [localSchedule, setLocalSchedule] = useState<Schedule>()

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

  const getScheduleQuery = useQuery({
    queryKey: ['sweep-get-schedule', walletFileName],
    retry: false,
    enabled: jmSession?.coinjoin_in_process === true,
    refetchInterval: jmSession?.coinjoin_in_process === true ? WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL : false,
    refetchIntervalInBackground: true,
    queryFn: async ({ signal }) => {
      const result = await getschedule({
        client,
        signal,
        path: { walletname: encodeURIComponent(walletFileName) },
        throwOnError: false,
      })

      if (result.error !== undefined) {
        if (result.response.status === 404) {
          return undefined
        }
        throw new Error(getErrorReason(result.error, 'Failed to load schedule'))
      }

      return result.data
    },
  })

  const stopScheduleQueryOptions = stopcoinjoinOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName) },
  })

  const stopScheduleQuery = useQuery({
    ...stopScheduleQueryOptions,
    enabled: false,
    retry: false,
    staleTime: 1,
    gcTime: 1,
  })

  const startScheduleMutation = useMutation({
    ...runscheduleMutation({ client }),
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onSuccess: (result) => {
      if (isScheduleValue(result.schedule)) {
        setLocalSchedule(result.schedule)
      }
      setShowScheduleConfirmDialog(false)
    },
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = `${t('scheduler.error_starting_schedule_failed')} ${reason}`
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const stopScheduleMutation = useMutation({
    mutationFn: async () => {
      return await stopScheduleQuery.refetch({ throwOnError: true })
    },
    retry: false,
    onMutate: () => {
      setAlertMessage(undefined)
    },
    onSuccess: () => {
      setLocalSchedule(undefined)
    },
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = `${t('scheduler.error_stopping_schedule_failed')} ${reason}`
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const sessionSchedule = isScheduleValue(jmSession?.schedule) ? jmSession.schedule : undefined
  const queriedSchedule = isScheduleValue(getScheduleQuery.data?.schedule) ? getScheduleQuery.data.schedule : undefined
  const currentSchedule = sessionSchedule ?? queriedSchedule ?? localSchedule

  const schedulerRunning = jmSession?.coinjoin_in_process === true && currentSchedule !== undefined
  const singleCoinJoinRunning = jmSession?.coinjoin_in_process === true && !schedulerRunning
  const makerRunning = jmSession?.maker_running === true
  const collaborativeOperationRunning = makerRunning || jmSession?.coinjoin_in_process === true

  const isWaitingSchedulerStart =
    startScheduleMutation.isPending || (startScheduleMutation.isSuccess && !schedulerRunning)
  const isWaitingSchedulerStop = stopScheduleMutation.isPending || (stopScheduleMutation.isSuccess && schedulerRunning)

  useRefreshSession({
    enabled: isWaitingSchedulerStart || isWaitingSchedulerStop,
    refetchInterval: WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL,
    refetchDelay: WAIT_FOR_UPDATE_SESSION_POLLING_DELAY,
  })

  useEffect(() => {
    if (schedulerRunning && startScheduleMutation.isSuccess) {
      startScheduleMutation.reset()
    }
  }, [schedulerRunning, startScheduleMutation])

  useEffect(() => {
    if (!schedulerRunning && stopScheduleMutation.isSuccess) {
      stopScheduleMutation.reset()
    }
  }, [schedulerRunning, stopScheduleMutation])

  const isOperationDisabled =
    maxFeesConfigMissing || collaborativeOperationRunning || jmSession?.rescanning || !preconditionSummary.isFulfilled

  const isStartDisabled =
    isOperationDisabled ||
    isWaitingSchedulerStart ||
    isWaitingSchedulerStop ||
    hasDestinationErrors ||
    !allDestinationAddressesPresent

  const touchAllDestinations = () => {
    setDestinationTouched((current) => current.map(() => true))
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

  const startSchedule = async () => {
    touchAllDestinations()
    if (isStartDisabled) {
      return
    }

    await startScheduleMutation.mutateAsync({
      path: { walletname: encodeURIComponent(walletFileName) },
      body: {
        destination_addresses: normalizeDestinationAddresses(destinationAddresses),
      },
    })
  }

  const onOpenScheduleConfirm = () => {
    touchAllDestinations()
    if (isStartDisabled) {
      return
    }
    setShowScheduleConfirmDialog(true)
  }

  const stopSchedule = async () => {
    await stopScheduleMutation.mutateAsync()
  }

  if (isLoading || walletInfo.isLoading || jmSession === undefined) {
    return <PageLoading />
  }

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

      {schedulerRunning && currentSchedule && (
        <SweepScheduleProgress schedule={currentSchedule} isStopping={isWaitingSchedulerStop} onStop={stopSchedule} />
      )}

      {!schedulerRunning && (
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
