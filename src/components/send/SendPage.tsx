import { useEffect, useMemo, useState } from 'react'
import {
  directsendMutation,
  docoinjoinMutation,
  stopcoinjoinOptions,
} from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type {
  DirectSendRequest,
  DirectSendResponse,
  DoCoinjoinRequest,
} from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckCircle2Icon, HourglassIcon, ListFilterIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
import { useJamSessionInfoContext } from '@/context/JamSessionInfoContext'
import {
  useAddressSummary,
  useJamWalletInfoContext,
  useJars,
  useWalletBalanceSummary,
} from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useJmConfig } from '@/hooks/useJmConfig'
import type { UtxoId } from '@/hooks/useQueryUtxos'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { useUtxoSelectionDialog } from '@/hooks/useUtxoSelectionDialog'
import { getErrorReason } from '@/lib/errorReason'
import * as fb from '@/lib/fidelityBondUtils'
import { withMutationDelay } from '@/lib/queryClient'
import { scrollToTop, type WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import type { JarIndex } from '@/types/global'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Spinner } from '../ui/spinner'
import { ActiveCollaborativeSendAlert } from './ActiveCollaborativeSendAlert'
import { PaymentAbortDialog } from './PaymentAbortDialog'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import { SendForm } from './SendForm'
import { ERROR_SOURCE_JAR_NEEDS_MANUAL_COIN_CONTROL } from './SendForm.schema'
import { UtxoSelectionDialog } from './UtxoSelectionDialog'
import { buildCollaborativeSendRequest, buildNonCollaborativeSendRequest } from './collaborativeSend'
import type { SendFormValues } from './types'

interface SimpleAlert {
  variant: React.ComponentProps<typeof Alert>['variant']
  title: string
  description: string
}

type DirectSendResult = {
  request: DirectSendRequest
  response: DirectSendResponse
}
type CollaborativeSendResult = {
  request: DoCoinjoinRequest
  response: unknown
}

interface SendPageProps {
  walletFileName: WalletFileName
}

export const SendPage = ({ walletFileName }: SendPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const [formId, setFormId] = useState<number>(0)
  const { fetchIfMissing } = useJmConfig({ walletFileName })
  const {
    isLoading: walletInfoIsLoading,
    isFetching: walletInfoIsFetching,
    utxosHashHex,
    waitForUtxosToBeSpent,
    setWaitForUtxosToBeSpent,
  } = useJamWalletInfoContext()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const {
    takerInfo: {
      running: takerRunning,
      currentPaymentAttempt,
      scheduler: { running: schedulerRunning },
    },
    rescanInfo,
    setCurrentPaymentAttempt,
    clearCurrentPaymentAttempt,
  } = useJamSessionInfoContext()

  const { enabled: isDeveloperMode } = useDeveloperMode()

  const feeConfigValidation = useFeeConfigValidation({ walletFileName })
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [showAbortCoinjoinDialog, setShowAbortCoinjoinDialog] = useState(false)
  const [sendFromValuesAwaitingConfirmation, setSendFromValuesAwaitingConfirmation] = useState<SendFormValues>()
  const [nonCollaborativePaymentSuccessInfoAlert, setNonCollaborativePaymentSuccessInfoAlert] = useState<SimpleAlert>()
  const [minimumCollaborators, setMinimumCollaborators] = useState<number>()
  const [collaborativeFlowError, setCollaborativeFlowError] = useState<string>()
  const [sourceJarIndex, setSourceJarIndex] = useState<JarIndex>()

  const { addressSummary } = useAddressSummary()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()

  const sourceJar = useMemo(() => {
    if (sourceJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === sourceJarIndex)
  }, [jars, sourceJarIndex])

  const { onOpenUtxoSelector, ...utxoSelectionDialog } = useUtxoSelectionDialog({
    walletFileName,
    sourceJar,
    addressSummary,
  })

  const availableUtxosForPayment = useMemo(() => {
    const isCoinJoin = sendFromValuesAwaitingConfirmation?.isCoinJoin ?? true // assume true
    return (sourceJar?.utxos || [])
      .filter((utxo) => !utxo.frozen)
      .filter((utxo) => !fb.utxo.isLocked(utxo))
      .filter((utxo) => (isCoinJoin ? true : !fb.utxo.isFidelityBond(utxo)))
      .toSorted((a, b) => a.confirmations - b.confirmations)
  }, [sourceJar, sendFromValuesAwaitingConfirmation?.isCoinJoin])

  const destinationJar = useMemo(() => {
    const destinationJarIndex = sendFromValuesAwaitingConfirmation?.destination?.fromJar
    if (destinationJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, sendFromValuesAwaitingConfirmation])

  const directSendMutation = useMutation({
    ...directsendMutation({ client }),
    retry: false,
  })

  const {
    isPending: startCoinjoinMutationIsPending,
    isSuccess: startCoinjoinMutationIsSuccess,
    mutateAsync: startCoinjoinMutationMutateAsync,
    reset: startCoinjoinMutationReset,
  } = useMutation({
    ...docoinjoinMutation({ client }),
    retry: false,
    onMutate: () => {
      setCollaborativeFlowError(undefined)
    },
    onSuccess: () => {
      toast.info(t('send.alert_collaborative_starting'))
    },
    onError: (error) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('send.error_starting_collaborative_transaction', { reason })
      setCollaborativeFlowError(message)
      toast.error(message)
    },
  })
  const stopCoinjoinQueryOptions = stopcoinjoinOptions({
    client,
    path: { walletname: walletFileName },
  })
  const stopCoinjoinQuery = useQuery({
    ...stopCoinjoinQueryOptions,
    enabled: false,
    retry: false,
    staleTime: 1,
    gcTime: 1,
  })
  const {
    isPending: stopCoinjoinMutationIsPending,
    isSuccess: stopCoinjoinMutationIsSuccess,
    mutateAsync: stopCoinjoinMutationMutateAsync,
    reset: stopCoinjoinMutationReset,
  } = useMutation({
    mutationFn: async () => {
      return await stopCoinjoinQuery.refetch({ throwOnError: true })
    },
    retry: false,
    onMutate: () => {
      setCollaborativeFlowError(undefined)
    },
    onSuccess: () => {
      clearCurrentPaymentAttempt()
      toast.info(t('send.alert_collaborative_stopping'))
    },
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('send.error_stopping_collaborative_transaction', { reason })
      setCollaborativeFlowError(message)
      toast.error(message)
    },
  })

  const isWaitingCoinjoinStart = startCoinjoinMutationIsPending || (startCoinjoinMutationIsSuccess && !takerRunning)
  const isWaitingCoinjoinStop = stopCoinjoinMutationIsPending || (stopCoinjoinMutationIsSuccess && takerRunning)

  useRefreshSession({
    enabled: isWaitingCoinjoinStart || isWaitingCoinjoinStop,
    refetchInterval: 3_000,
    refetchDelay: 1_000,
  })

  useRefreshSession({
    enabled: takerRunning,
    refetchInterval: 5_000,
    refetchDelay: 1_000,
  })

  useEffect(() => {
    if (takerRunning && startCoinjoinMutationIsSuccess) {
      startCoinjoinMutationReset()
    }
  }, [takerRunning, startCoinjoinMutationIsSuccess, startCoinjoinMutationReset])

  useEffect(() => {
    if (!takerRunning && stopCoinjoinMutationIsSuccess) {
      stopCoinjoinMutationReset()
    }
  }, [takerRunning, stopCoinjoinMutationIsSuccess, stopCoinjoinMutationReset])

  useEffect(() => {
    const abortCtrl = new AbortController()

    fetchIfMissing({ section: 'POLICY', field: 'minimum_makers' })
      .then((result) => {
        if (abortCtrl.signal.aborted) return

        const parsedValue = Number.parseInt(result.value || '', 10)
        if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
          return
        }
        setMinimumCollaborators(parsedValue)
      })
      .catch((error: unknown) => {
        if (abortCtrl.signal.aborted) return
        const reason = getErrorReason(error, t('global.errors.reason_unknown'))
        // TODO: i18n, add reason as param
        toast.error(`${t('send.error_loading_min_makers_failed')} ${reason}`)
      })

    return () => abortCtrl.abort()
  }, [fetchIfMissing, t])

  const triggerNonCollaborativeTransaction = useMutation<DirectSendResult, unknown, SendFormValues, unknown>({
    mutationFn: withMutationDelay(
      async (data: SendFormValues) => {
        const body: DirectSendRequest = buildNonCollaborativeSendRequest(data)
        const response = await directSendMutation.mutateAsync({
          path: {
            walletname: walletFileName,
          },
          body,
        })

        return {
          request: body,
          response,
        }
      },
      { throttle: 2_100 },
    ),
    onMutate: () => {
      setNonCollaborativePaymentSuccessInfoAlert(undefined)
      scrollToTop()
    },
    onSuccess: (result: DirectSendResult, data: SendFormValues) => {
      const tx = result.response.txinfo as Required<JmTxInfo>
      const output = tx.outputs.find((output) => output.address === data.destination.address)
      const inputUtxoIds = (tx.inputs || []).flatMap((it) =>
        it?.outpoint !== undefined ? [it.outpoint as UtxoId] : [],
      )

      jmTxStore.getState().add(tx)

      setWaitForUtxosToBeSpent(inputUtxoIds)
      setFormId((current) => current + 1)
      setNonCollaborativePaymentSuccessInfoAlert({
        variant: 'success',
        title: t('send.alert_direct_payment_success_title'),
        description: t('send.alert_payment_successful', {
          amount: output?.value_sats,
          address: output?.address,
          txid: tx.txid,
        }),
      })
      toast.success(t('send.alert_direct_payment_success_title'))
    },
    onError: (error) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('send.error_sending_direct_payment', { reason }))
    },
  })

  const triggerCollaborativeTransaction = useMutation<CollaborativeSendResult, unknown, SendFormValues, unknown>({
    mutationFn: withMutationDelay(
      async (data: SendFormValues) => {
        const body: DoCoinjoinRequest = buildCollaborativeSendRequest(data)
        const response = await startCoinjoinMutationMutateAsync({
          path: { walletname: walletFileName },
          body,
        })

        return {
          request: body,
          response,
        }
      },
      { throttle: 0 },
    ),
    onMutate: () => {
      setNonCollaborativePaymentSuccessInfoAlert(undefined)
      scrollToTop()
    },
    onSuccess: (_result, data) => {
      setCurrentPaymentAttempt({
        createdAt: Date.now(),
        walletFileName,
        utxosHashHex,
        data,
      })
    },
  })

  const onPaymentValuesConfirmed = async (data: SendFormValues) => {
    setShowPaymentConfirmDialog(false)
    setSendFromValuesAwaitingConfirmation(undefined)

    if (data.isCoinJoin === true) {
      if (feeConfigValidation.maxFeesConfigMissing) {
        toast.error(t('send.taker_error_message_max_fees_config_missing'))
        throw new Error(t('send.taker_error_message_max_fees_config_missing'))
      }

      try {
        await triggerCollaborativeTransaction.mutateAsync(data)
      } catch (error: unknown) {
        console.error('Error while sending collaborative transaction', error)
      }
    } else {
      try {
        await triggerNonCollaborativeTransaction.mutateAsync(data)
      } catch (error: unknown) {
        console.error('Error while sending non-collaborative transaction', error)
      }
    }
  }

  const onSubmit: SubmitHandler<SendFormValues> = (data) => {
    if (data.isCoinJoin && feeConfigValidation.maxFeesConfigMissing) {
      toast.error(t('send.taker_error_message_max_fees_config_missing'))
      setShowFeeConfigDialog(true)
      return
    }
    setSendFromValuesAwaitingConfirmation(data)
    setShowPaymentConfirmDialog(true)
  }

  const onAbortCoinjoinConfirmed = async () => {
    setShowAbortCoinjoinDialog(false)
    await stopCoinjoinMutationMutateAsync()
  }

  if (!jmSession || walletInfoIsLoading) {
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

      <PaymentAbortDialog
        open={showAbortCoinjoinDialog}
        onOpenChange={setShowAbortCoinjoinDialog}
        isConfirming={stopCoinjoinMutationIsPending}
        onConfirm={onAbortCoinjoinConfirmed}
      />

      <UtxoSelectionDialog {...utxoSelectionDialog.dialogProps} />
      {sourceJar && sendFromValuesAwaitingConfirmation && (
        <PaymentConfirmDialog
          open={showPaymentConfirmDialog}
          onOpenChange={setShowPaymentConfirmDialog}
          values={sendFromValuesAwaitingConfirmation}
          onConfirm={onPaymentValuesConfirmed}
          meta={{
            feeConfigValues: feeConfigValidation.feeConfigValues,
            availableUtxos: availableUtxosForPayment,
            sourceJar,
            destinationJar,
          }}
          debug={isDeveloperMode}
        />
      )}
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />

        {feeConfigValidation.maxFeesConfigMissing && (
          <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
        )}
        {jmSession?.maker_running === true && (
          <Alert variant="warning">
            <HourglassIcon className="motion-safe:animate-pulse" />
            <AlertDescription>{t('send.text_maker_running')}</AlertDescription>
          </Alert>
        )}
        {collaborativeFlowError && (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{t('global.error')}</AlertTitle>
            <AlertDescription>{collaborativeFlowError}</AlertDescription>
          </Alert>
        )}
        {isWaitingCoinjoinStart && (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('send.alert_collaborative_starting')}</AlertTitle>
          </Alert>
        )}
        {isWaitingCoinjoinStop && (
          <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('send.alert_collaborative_stopping')}</AlertTitle>
          </Alert>
        )}

        {
          /*
           * With backend "joinmarket-clientserver" there is no direct way of verifying
           * that a collaborative send attempt was successful.
           * We have to rely on local data `takerCurrentAttempt`
           * (which might not be present, e.g. taker was started from a different session)
           * for displaying success/error information.
           * If data `takerCurrentAttempt` is not present, no message is shown
           * when the taker service stops - this is not ideal, but okay.
           */
          currentPaymentAttempt !== undefined &&
            currentPaymentAttempt.data.isCoinJoin &&
            !isWaitingCoinjoinStart &&
            takerRunning === false && (
              <>
                {walletInfoIsFetching ? (
                  <>
                    <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
                      <Spinner className="motion-reduce:hidden" />
                      <AlertTitle>{t('send.alert_collaborative_awaiting_completion')}</AlertTitle>
                    </Alert>
                  </>
                ) : (
                  <>
                    {currentPaymentAttempt.utxosHashHex === utxosHashHex ? (
                      <Alert variant="warning">
                        <AlertTriangleIcon />
                        <AlertTitle>{t('send.alert_collaborative_ended_title')}</AlertTitle>
                        <AlertDescription className="flex flex-col gap-2">
                          <div>{t('send.alert_collaborative_ended_description')}</div>
                          <div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                clearCurrentPaymentAttempt()
                              }}
                            >
                              {t('global.done')}
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="success">
                        <CheckCircle2Icon />
                        <AlertTitle>{t('send.alert_collaborative_completed_title')}</AlertTitle>
                        <AlertDescription className="flex flex-col gap-2">
                          <div>{t('send.alert_collaborative_completed_description')}</div>
                          <div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setFormId((current) => current + 1)
                                clearCurrentPaymentAttempt()
                              }}
                            >
                              {t('global.done')}
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </>
            )
        }
        {takerRunning && !isWaitingCoinjoinStop && (
          <ActiveCollaborativeSendAlert
            paymentAttempt={currentPaymentAttempt}
            jars={jars}
            isWaitingCoinjoinStop={isWaitingCoinjoinStop}
            schedulerRunning={schedulerRunning}
            onAbort={() => setShowAbortCoinjoinDialog(true)}
          />
        )}

        {triggerNonCollaborativeTransaction.error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{t('send.alert_direct_payment_error_title')}</AlertTitle>
            <AlertDescription>
              <p>
                <Trans
                  i18nKey="send.alert_direct_payment_error_description"
                  values={{
                    reason: getErrorReason(triggerNonCollaborativeTransaction.error, t('global.errors.reason_unknown')),
                  }}
                >
                  The exact reason is not entirely clear, only the following is known:
                  <span className="inline font-mono font-semibold">"reason"</span>
                </Trans>
              </p>
              <p>{t('send.alert_direct_payment_error_hint')}</p>
            </AlertDescription>
          </Alert>
        ) : triggerNonCollaborativeTransaction.isPending ? (
          <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('send.alert_direct_payment_pending')}</AlertTitle>
          </Alert>
        ) : (
          <>
            {waitForUtxosToBeSpent.length > 0 && (
              <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
                <Spinner className="motion-reduce:hidden" />
                <AlertTitle>{t('send.alert_waiting_utxos_spent')}</AlertTitle>
              </Alert>
            )}
            {nonCollaborativePaymentSuccessInfoAlert && (
              <Alert variant={nonCollaborativePaymentSuccessInfoAlert.variant}>
                <CheckCircle2Icon />
                <AlertTitle>{nonCollaborativePaymentSuccessInfoAlert.title}</AlertTitle>
                <AlertDescription className="text-wrap slashed-zero">
                  {nonCollaborativePaymentSuccessInfoAlert.description}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <Card>
          <CardContent>
            <SendForm
              key={formId}
              onSubmit={onSubmit}
              walletFileName={walletFileName}
              minNumberOfCollaborators={minimumCollaborators}
              feeConfigValues={feeConfigValidation.feeConfigValues}
              jars={jars}
              addressSummary={addressSummary}
              walletBalanceSummary={walletBalanceSummary}
              disabled={
                jmSession?.maker_running === true ||
                takerRunning ||
                rescanInfo.rescanning ||
                isWaitingCoinjoinStart ||
                isWaitingCoinjoinStop ||
                utxoSelectionDialog.isSubmitting ||
                triggerNonCollaborativeTransaction.isPending ||
                triggerCollaborativeTransaction.isPending ||
                currentPaymentAttempt !== undefined ||
                waitForUtxosToBeSpent.length > 0
              }
              debug={isDeveloperMode}
              onSourceJarChange={setSourceJarIndex}
              onSourceJarClicked={onOpenUtxoSelector}
              sourceJarLabelButton={(errors) => {
                const errorSolvedByUtxoSelection = errors?.fromJar?.type === ERROR_SOURCE_JAR_NEEDS_MANUAL_COIN_CONTROL
                const animate = utxoSelectionDialog.dialogProps.open === false && errorSolvedByUtxoSelection
                return (
                  <Button
                    type="button"
                    variant="outline"
                    className={animate ? 'animate-shake' : undefined}
                    disabled={utxoSelectionDialog.utxoSelectorDisabled}
                    onClick={onOpenUtxoSelector}
                  >
                    <ListFilterIcon className={animate ? 'motion-safe:animate-bounce' : undefined} />
                    {t('show_utxos.text_select_utxos_tooltip')}
                  </Button>
                )
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
