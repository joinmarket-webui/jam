import { useEffect, useMemo, useState, useRef } from 'react'
import {
  directsendMutation,
  docoinjoinMutation,
  stopcoinjoinOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendRequest, DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import { AlertTriangleIcon, HourglassIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
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
import { useWaitForUtxosToBeSpent } from '@/hooks/useWaitForUtxosToBeSpent'
import { getErrorReason } from '@/lib/errorReason'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Spinner } from '../ui/spinner'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import { SendForm } from './SendForm'
import { buildCollaborativeSendRequest } from './collaborativeSend'
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

interface SendPageProps {
  walletFileName: WalletFileName
}

export const SendPage = ({ walletFileName }: SendPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const { fetchIfMissing } = useJmConfig({ walletFileName })
  const { refetch: refetchWalletInfo } = useJamWalletInfoContext()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [showAbortCoinjoinDialog, setShowAbortCoinjoinDialog] = useState(false)
  const [sendFromValuesAwaitingConfirmation, setSendFromValuesAwaitingConfirmation] = useState<SendFormValues>()
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState<SimpleAlert>()
  const [minimumCollaborators, setMinimumCollaborators] = useState<number>()
  const [collaborativeFlowError, setCollaborativeFlowError] = useState<string>()
  // Track previous coinjoinRunning to detect completion transitions
  const previousCoinjoinRunningRef = useRef(false)

  const { addressSummary } = useAddressSummary()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()

  const sourceJar = useMemo(() => {
    const sourceJarIndex = sendFromValuesAwaitingConfirmation?.source?.fromJar
    if (sourceJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === sourceJarIndex)
  }, [jars, sendFromValuesAwaitingConfirmation])

  const availableUtxosForPayment = useMemo(() => {
    return (sourceJar?.utxos || []).filter((utxo) => !utxo.frozen).toSorted((a, b) => a.confirmations - b.confirmations)
  }, [sourceJar])

  const destinationJar = useMemo(() => {
    const destinationJarIndex = sendFromValuesAwaitingConfirmation?.destination?.fromJar
    if (destinationJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, sendFromValuesAwaitingConfirmation])

  const {
    feeConfigValues,
    maxFeesConfigMissing,
    isLoading: isLoadingFeeConfig,
  } = useFeeConfigValidation({ walletFileName })

  const directSendMutation = useMutation({
    ...directsendMutation({ client }),
    retry: false,
  })
  const startCoinjoinMutation = useMutation({
    ...docoinjoinMutation({ client }),
    retry: false,
    onMutate: () => {
      setCollaborativeFlowError(undefined)
    },
    onSuccess: () => {
      toast.success(t('send.alert_collaborative_started_title'))
    },
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('send.error_starting_collaborative_transaction', { reason })
      setCollaborativeFlowError(message)
      toast.error(message)
    },
  })
  const stopCoinjoinQueryOptions = stopcoinjoinOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName) },
  })
  const stopCoinjoinQuery = useQuery({
    ...stopCoinjoinQueryOptions,
    enabled: false,
    retry: false,
    staleTime: 1,
    gcTime: 1,
  })
  const stopCoinjoinMutation = useMutation({
    mutationFn: async () => {
      return await stopCoinjoinQuery.refetch({ throwOnError: true })
    },
    retry: false,
    onMutate: () => {
      setCollaborativeFlowError(undefined)
    },
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const message = t('send.error_stopping_collaborative_transaction', { reason })
      setCollaborativeFlowError(message)
      toast.error(message)
    },
  })

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<UtxoId[]>([])
  const coinjoinRunning = jmSession?.coinjoin_in_process === true
  const isWaitingCoinjoinStart =
    startCoinjoinMutation.isPending || (startCoinjoinMutation.isSuccess && !coinjoinRunning)
  const isWaitingCoinjoinStop = stopCoinjoinMutation.isPending || (stopCoinjoinMutation.isSuccess && coinjoinRunning)
  const collaborativeFlowActive = coinjoinRunning || isWaitingCoinjoinStart || isWaitingCoinjoinStop

  const waitForUtxosToBeSpentContext = useMemo(
    () => ({
      walletFileName,
      waitForUtxosToBeSpent,
      setWaitForUtxosToBeSpent,
      onError: (error: unknown) => {
        const reason = getErrorReason(error, t('global.errors.reason_unknown'))
        const message = t('global.errors.error_reloading_wallet_failed', {
          reason,
        })
        toast.error(message)
      },
    }),
    [walletFileName, waitForUtxosToBeSpent, t],
  )

  useWaitForUtxosToBeSpent(waitForUtxosToBeSpentContext)

  useRefreshSession({
    enabled: isWaitingCoinjoinStart || isWaitingCoinjoinStop,
    refetchInterval: 3_000,
    refetchDelay: 1_000,
  })

  useEffect(() => {
    if (coinjoinRunning && startCoinjoinMutation.isSuccess) {
      startCoinjoinMutation.reset()
    }
  }, [coinjoinRunning, startCoinjoinMutation])

  // Detect when a collaborative transaction completes (running → not running)
  useEffect(() => {
    const wasRunning = previousCoinjoinRunningRef.current
    previousCoinjoinRunningRef.current = coinjoinRunning

    if (wasRunning && !coinjoinRunning) {
      queueMicrotask(() => {
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          title: t('send.alert_collaborative_completed_title'),
          description: t('send.alert_collaborative_completed_description'),
        })
        toast.success(t('send.alert_collaborative_completed_title'))
      })
      void refetchWalletInfo()
    }
  }, [coinjoinRunning, refetchWalletInfo, t])

  useEffect(() => {
    if (!coinjoinRunning && stopCoinjoinMutation.isSuccess) {
      stopCoinjoinMutation.reset()
    }
  }, [coinjoinRunning, stopCoinjoinMutation])

  useEffect(() => {
    let isCancelled = false

    fetchIfMissing({ section: 'POLICY', field: 'minimum_makers' })
      .then((result) => {
        if (isCancelled) return

        const parsedValue = Number.parseInt(result.value || '', 10)
        if (!Number.isInteger(parsedValue) || parsedValue < 1) {
          return
        }
        setMinimumCollaborators(parsedValue)
      })
      .catch((error: unknown) => {
        if (isCancelled) return
        const reason = getErrorReason(error, t('global.errors.reason_unknown'))
        toast.error(`${t('send.error_loading_min_makers_failed')} ${reason}`)
      })

    return () => {
      isCancelled = true
    }
  }, [fetchIfMissing, t])

  const triggerNonCollaborativeTransaction = useMutation<DirectSendResult, ErrorMessage, SendFormValues, unknown>({
    mutationFn: async (data: SendFormValues) => {
      if (data.amount === undefined) {
        throw new Error('Cannot trigger non-collaborative transaction: Invalid amount given.')
      }
      if (data.destination === undefined || !isValidBitcoinAddress(data.destination.address)) {
        throw new Error('Cannot trigger non-collaborative transaction: Invalid bitcoin address given.')
      }
      if (data.source?.fromJar === undefined) {
        throw new Error('Cannot trigger non-collaborative transaction: Invalid source jar given.')
      }
      if (data.amount.isSweep === true && data.amount.amount !== undefined) {
        throw new Error('Cannot trigger non-collaborative transaction: Invalid amount given for sweep.')
      }

      const body = {
        amount_sats: data.amount.isSweep === true ? 0 : data.amount.amount,
        destination: data.destination.address,
        mixdepth: data.source.fromJar,
      }
      const response = await directSendMutation.mutateAsync({
        path: {
          walletname: encodeURIComponent(walletFileName),
        },
        body,
      })

      return {
        request: body,
        response,
      }
    },
    onSuccess: () => {
      /* TODO: i18n */
      toast.success('Successfully sent non-collaborative transaction.')
    },
    onError: (error) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      /* TODO: i18n */
      toast.error(`Error while sending non-collaborative transaction: ${reason}`)
    },
  })

  const onSubmitDirectSend: SubmitHandler<SendFormValues> = async (data) => {
    try {
      setPaymentSuccessfulInfoAlert(undefined)
      const result = await triggerNonCollaborativeTransaction.mutateAsync(data)
      const tx = result.response.txinfo as Required<JmTxInfo>

      const output = tx.outputs.find((output) => output.address === data.destination.address)
      setPaymentSuccessfulInfoAlert({
        variant: 'success',
        title: /* TODO: i18n */ 'Successfully sent non-collaborative transaction',
        description: t('send.alert_payment_successful', {
          amount: output?.value_sats,
          address: output?.address,
          txid: tx.txid,
        }),
      })

      const inputUtxoIds = (result.response.txinfo.inputs || []).flatMap((it) =>
        it?.outpoint !== undefined ? [it.outpoint as UtxoId] : [],
      )
      setWaitForUtxosToBeSpent(inputUtxoIds)

      jmTxStore.getState().add(result.response.txinfo as JmTxInfo)
    } catch (error: unknown) {
      console.error('Error while sending non-collaborative transaction', error)
    }
  }

  const onPaymentConfirmed: SubmitHandler<SendFormValues> = async (data) => {
    if (data.isCoinJoin !== true) {
      await onSubmitDirectSend(data)
    } else {
      if (maxFeesConfigMissing) {
        toast.error(t('send.taker_error_message_max_fees_config_missing'))
        setShowFeeConfigDialog(true)
        return
      }

      try {
        const body = buildCollaborativeSendRequest(data)
        setPaymentSuccessfulInfoAlert(undefined)
        await startCoinjoinMutation.mutateAsync({
          path: { walletname: encodeURIComponent(walletFileName) },
          body,
        })
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          title: t('send.alert_collaborative_started_title'),
          description: t('send.alert_collaborative_started_description'),
        })
      } catch (error: unknown) {
        const reason = getErrorReason(error, t('global.errors.reason_unknown'))
        const message = t('send.error_preparing_collaborative_transaction', { reason })
        setCollaborativeFlowError(message)
        toast.error(message)
      }
    }
  }

  const onSubmit: SubmitHandler<SendFormValues> = (data) => {
    setSendFromValuesAwaitingConfirmation(data)
    setShowPaymentConfirmDialog(true)
  }

  const onAbortCoinjoin = async () => {
    setPaymentSuccessfulInfoAlert(undefined)
    setShowAbortCoinjoinDialog(false)
    await stopCoinjoinMutation.mutateAsync()
    void refetchWalletInfo()
  }

  if (isLoadingFeeConfig) {
    return <PageLoading />
  }

  return (
    <>
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
      <Dialog open={showAbortCoinjoinDialog} onOpenChange={setShowAbortCoinjoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('send.confirm_abort_modal.title')}</DialogTitle>
            <DialogDescription>{t('send.confirm_abort_modal.text_body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbortCoinjoinDialog(false)}>
              {t('modal.confirm_button_reject')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onAbortCoinjoin()}
              disabled={stopCoinjoinMutation.isPending}
            >
              {stopCoinjoinMutation.isPending ? (
                <>
                  <Spinner className="motion-reduce:hidden" />
                  {t('global.abort')}
                </>
              ) : (
                t('global.abort')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sourceJar && sendFromValuesAwaitingConfirmation && (
        <PaymentConfirmDialog
          open={showPaymentConfirmDialog}
          onOpenChange={setShowPaymentConfirmDialog}
          title={t('send.confirm_send_modal.title')}
          subtitle={
            sendFromValuesAwaitingConfirmation.isCoinJoin === true ? (
              <span className="light:text-green-600/80 text-green-700/80">
                {t('send.confirm_send_modal.text_collaborative_tx_enabled')}
              </span>
            ) : (
              <span className="text-destructive">{t('send.confirm_send_modal.text_collaborative_tx_disabled')}</span>
            )
          }
          values={sendFromValuesAwaitingConfirmation}
          onConfirm={async () => {
            setShowPaymentConfirmDialog(false)
            await onPaymentConfirmed(sendFromValuesAwaitingConfirmation)
          }}
          meta={{
            feeConfigValues: feeConfigValues,
            availableUtxos: availableUtxosForPayment,
            sourceJar,
            destinationJar,
          }}
          debug={isDeveloperMode}
        />
      )}
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />

        {maxFeesConfigMissing && (
          <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
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

        {coinjoinRunning && (
          <Alert variant="warning">
            <HourglassIcon />
            <AlertTitle>{t('send.text_coinjoin_already_running')}</AlertTitle>
            <AlertDescription className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAbortCoinjoinDialog(true)}
                disabled={isWaitingCoinjoinStop}
              >
                {isWaitingCoinjoinStop ? (
                  <>
                    <Spinner className="motion-reduce:hidden" />
                    {t('global.abort')}
                  </>
                ) : (
                  t('global.abort')
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {triggerNonCollaborativeTransaction.error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{/* TODO: i18n */}Error while sending non-collaborative transaction</AlertTitle>
            <AlertDescription className="">
              <p>
                The exact reason is not entirely clear, only the following is known:{' '}
                <span className="inline font-mono font-semibold">
                  "{getErrorReason(triggerNonCollaborativeTransaction.error, t('global.errors.reason_unknown'))}"
                </span>
                <br />
              </p>
              <p>Please validate your inputs and try again.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {paymentSuccessfulInfoAlert && !coinjoinRunning && (
              <>
                <Alert variant={paymentSuccessfulInfoAlert.variant}>
                  <AlertTriangleIcon />
                  <AlertTitle>{paymentSuccessfulInfoAlert.title}</AlertTitle>
                  <AlertDescription className="ext-wrap slashed-zero">
                    {paymentSuccessfulInfoAlert.description}
                  </AlertDescription>
                </Alert>

                {waitForUtxosToBeSpent.length > 0 && (
                  <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
                    <Spinner className="motion-reduce:hidden" />
                    <AlertTitle>{/* TODO: i18n*/ t('Waiting for utxos to be marked as spent...')}</AlertTitle>
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {/* Earn Form */}
        <Card>
          <CardContent>
            <SendForm
              onSubmit={onSubmit}
              walletFileName={walletFileName}
              minNumberOfCollaborators={minimumCollaborators}
              feeConfigValues={feeConfigValues}
              forceCoinJoinEnabled={collaborativeFlowActive}
              jars={jars}
              addressSummary={addressSummary}
              walletBalanceSummary={walletBalanceSummary}
              disabled={
                jmSession?.maker_running ||
                collaborativeFlowActive ||
                jmSession?.rescanning ||
                waitForUtxosToBeSpent.length > 0
              }
              debug={isDeveloperMode}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
