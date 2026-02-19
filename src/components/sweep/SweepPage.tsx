import { useEffect, useMemo, useRef, useState } from 'react'
import { runscheduleMutation, stopcoinjoinOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { SweepSuccessMessage } from '@/components/sweep/SweepSuccessMessage'
import { buildDestinationErrors, normalizeDestinationAddresses } from '@/components/sweep/destinationValidation'
import { buildSweepPreconditionSummary } from '@/components/sweep/preconditions'
import { isScheduleLikelyCompletedSuccessfully, isScheduleValue } from '@/components/sweep/scheduleUtils'
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
import type { Schedule } from './scheduleUtils'

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
  const [lastKnownSchedule, setLastKnownSchedule] = useState<Schedule>()
  const [dismissedSuccessScheduleSignature, setDismissedSuccessScheduleSignature] = useState<string>()
  const showInsecureScheduleTestingToggle = isDebugFeatureEnabled('insecureScheduleTesting')
  const previousSchedulerStateRef = useRef<{ blockHeight?: number; scheduleSignature: string }>({
    scheduleSignature: '[]',
  })

  const { maxFeesConfigMissing, isLoading } = useFeeConfigValidation({ walletFileName })
  const allUtxos = useMemo(() => {
    return walletInfo.jars.flatMap((jar) => jar.utxos)
  }, [walletInfo.jars])
  const allUtxosFrozen = useMemo(() => allUtxos.every((utxo) => utxo.frozen), [allUtxos])
  const refetchUtxos = walletInfo.utxosQueryResult.refetch

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
    onSuccess: () => {
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
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = `${t('scheduler.error_stopping_schedule_failed')} ${reason}`
      setAlertMessage(message)
      toast.error(message)
    },
  })

  const sessionSchedule = isScheduleValue(jmSession?.schedule) ? jmSession.schedule : undefined
  const sessionScheduleSignature = useMemo(() => JSON.stringify(sessionSchedule ?? []), [sessionSchedule])
  const currentSchedule = sessionSchedule
  const lastKnownScheduleSignature = useMemo(() => JSON.stringify(lastKnownSchedule ?? []), [lastKnownSchedule])

  const schedulerRunning = jmSession?.coinjoin_in_process === true && currentSchedule !== undefined
  const singleCoinJoinRunning = jmSession?.coinjoin_in_process === true && !schedulerRunning
  const makerRunning = jmSession?.maker_running === true
  const collaborativeOperationRunning = makerRunning || jmSession?.coinjoin_in_process === true

  const isWaitingSchedulerStart = startScheduleMutation.isPending
  const isWaitingSchedulerStop = stopScheduleMutation.isPending

  const sessionPollingInterval = showInsecureScheduleTestingToggle
    ? WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL_DEV
    : WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL_PROD

  useRefreshSession({
    enabled: schedulerRunning || isWaitingSchedulerStart || isWaitingSchedulerStop,
    refetchInterval: sessionPollingInterval,
    refetchDelay: WAIT_FOR_UPDATE_SESSION_POLLING_DELAY,
  })

  useEffect(() => {
    if (!schedulerRunning) {
      previousSchedulerStateRef.current = {
        blockHeight: jmSession?.block_height,
        scheduleSignature: sessionScheduleSignature,
      }
      return
    }

    const previous = previousSchedulerStateRef.current
    const blockHeightChanged = previous.blockHeight !== undefined && previous.blockHeight !== jmSession?.block_height
    const scheduleChanged = previous.scheduleSignature !== sessionScheduleSignature

    previousSchedulerStateRef.current = {
      blockHeight: jmSession?.block_height,
      scheduleSignature: sessionScheduleSignature,
    }

    if (!blockHeightChanged && !scheduleChanged) {
      return
    }

    void refetchUtxos()
  }, [schedulerRunning, jmSession?.block_height, refetchUtxos, sessionScheduleSignature])

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

  useEffect(() => {
    if (currentSchedule !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- we intentionally keep the last live schedule snapshot for success state after session clears it.
      setLastKnownSchedule(currentSchedule)
    }
  }, [currentSchedule])

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

  const startSchedule = async () => {
    touchAllDestinations()
    if (isStartDisabled) {
      return
    }

    const body = {
      destination_addresses: normalizeDestinationAddresses(destinationAddresses),
      ...(showInsecureScheduleTestingToggle && useInsecureTestingSettings
        ? { tumbler_options: INSECURE_SCHEDULE_TUMBLER_OPTIONS }
        : {}),
    }

    await startScheduleMutation.mutateAsync({
      path: { walletname: encodeURIComponent(walletFileName) },
      body,
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

  const completedScheduleToShow =
    !schedulerRunning &&
    !isWaitingSchedulerStart &&
    !isWaitingSchedulerStop &&
    lastKnownSchedule !== undefined &&
    isScheduleLikelyCompletedSuccessfully(lastKnownSchedule, allUtxosFrozen) &&
    dismissedSuccessScheduleSignature !== lastKnownScheduleSignature
      ? lastKnownSchedule
      : undefined

  const dismissSuccessMessage = () => {
    setDismissedSuccessScheduleSignature(lastKnownScheduleSignature)
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

      {completedScheduleToShow !== undefined ? (
        <SweepSuccessMessage schedule={completedScheduleToShow} onContinue={dismissSuccessMessage} />
      ) : (
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
        </>
      )}
    </div>
  )
}
