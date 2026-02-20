import { useEffect, useMemo, useState } from 'react'
import { directsendMutation, docoinjoinMutation, stopcoinjoinOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
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
import { Button } from '@/components/ui/button'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
import { useAddressSummary, useJamWalletInfoContext, useJars, useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { UtxoId } from '@/hooks/useQueryUtxos'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { useWaitForUtxosToBeSpent } from '@/hooks/useWaitForUtxosToBeSpent'
import { getErrorReason } from '@/lib/errorReason'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import { Card, CardContent } from '../ui/card'
import { Spinner } from '../ui/spinner'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import { SendForm } from './SendForm'
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

const WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL = 3_000
const WAIT_FOR_UPDATE_SESSION_POLLING_DELAY = 1_000

interface SendPageProps {
  walletFileName: WalletFileName
}

export const SendPage = ({ walletFileName }: SendPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [sendFromValuesAwaitingConfirmation, setSendFromValuesAwaitingConfirmation] = useState<SendFormValues>()
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState<SimpleAlert>()

  const { addressSummary } = useAddressSummary()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()
  const { refetch: refetchWalletInfo } = useJamWalletInfoContext()

  const sourceJar = useMemo(() => {
    const sourceJarIndex = sendFromValuesAwaitingConfirmation?.source?.fromJar
    if (sourceJarIndex === undefined) return
    return jars[sourceJarIndex]
  }, [jars, sendFromValuesAwaitingConfirmation])

  const availableUtxosForPayment = useMemo(() => {
    return (sourceJar?.utxos || []).filter((utxo) => !utxo.frozen).toSorted((a, b) => a.confirmations - b.confirmations)
  }, [sourceJar])

  const destinationJar = useMemo(() => {
    const destinationJarIndex = sendFromValuesAwaitingConfirmation?.destination?.fromJar
    if (destinationJarIndex === undefined) return
    return jars[destinationJarIndex]
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

  const coinjoinMutation = useMutation({
    ...docoinjoinMutation({ client }),
    retry: false,
    onMutate: () => {
      setPaymentSuccessfulInfoAlert(undefined)
    },
    onSuccess: () => {
      setShowPaymentConfirmDialog(false)
      toast.success(t('send.alert_payment_successful', {
        amount: sendFromValuesAwaitingConfirmation?.amount?.isSweep
          ? 'sweep'
          : sendFromValuesAwaitingConfirmation?.amount?.amount,
        address: sendFromValuesAwaitingConfirmation?.destination?.address,
        txid: '',
      }))
    },
    onError: (error: ErrorMessage) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(`${t('send.direct_payment_error_message_bad_request')} ${reason}`)
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
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(reason)
    },
  })

  const singleCoinJoinRunning = jmSession?.coinjoin_in_process === true
  const makerRunning = jmSession?.maker_running === true
  const isWaitingCoinjoinStart =
    coinjoinMutation.isPending || (coinjoinMutation.isSuccess && !singleCoinJoinRunning)
  const isWaitingCoinjoinStop =
    stopCoinjoinMutation.isPending || (stopCoinjoinMutation.isSuccess && singleCoinJoinRunning)

  useRefreshSession({
    enabled: isWaitingCoinjoinStart || isWaitingCoinjoinStop || singleCoinJoinRunning,
    refetchInterval: WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL,
    refetchDelay: WAIT_FOR_UPDATE_SESSION_POLLING_DELAY,
  })

  useEffect(() => {
    if (singleCoinJoinRunning && coinjoinMutation.isSuccess) {
      coinjoinMutation.reset()
    }
  }, [singleCoinJoinRunning, coinjoinMutation])

  useEffect(() => {
    if (!singleCoinJoinRunning && stopCoinjoinMutation.isSuccess) {
      stopCoinjoinMutation.reset()
      // Also reset coinjoin mutation to avoid stuck "waiting" state
      if (coinjoinMutation.isSuccess) {
        coinjoinMutation.reset()
      }
      // Refetch wallet info after coinjoin has been stopped/completed
      void refetchWalletInfo()
    }
  }, [singleCoinJoinRunning, stopCoinjoinMutation, coinjoinMutation, refetchWalletInfo])

  // Reset coinjoin mutation if it's stuck in success state but coinjoin is no longer running
  // This handles edge cases where the session never reflected coinjoin_in_process: true
  useEffect(() => {
    if (!singleCoinJoinRunning && coinjoinMutation.isSuccess) {
      const timeout = setTimeout(() => {
        if (!singleCoinJoinRunning && coinjoinMutation.isSuccess) {
          coinjoinMutation.reset()
        }
      }, WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL * 10)
      return () => clearTimeout(timeout)
    }
  }, [singleCoinJoinRunning, coinjoinMutation])

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<UtxoId[]>([])

  const waitForUtxosToBeSpentContext = useMemo(
    () => ({
      walletFileName,
      waitForUtxosToBeSpent,
      setWaitForUtxosToBeSpent,
      onError: (error: unknown) => {
        const reason =
          typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
            ? error.message
            : undefined

        const message = t('global.errors.error_reloading_wallet_failed', {
          reason: reason || t('global.errors.reason_unknown'),
        })
        toast.error(message)
      },
    }),
    [walletFileName, waitForUtxosToBeSpent, t],
  )

  useWaitForUtxosToBeSpent(waitForUtxosToBeSpentContext)

  const triggerNonCollarborativeTransaction = useMutation<DirectSendResult, ErrorMessage, SendFormValues, unknown>({
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
    onError: (error) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(`${t('send.direct_payment_error_message_bad_request')} ${reason}`)
    },
  })

  const onSubmitDirectSend: SubmitHandler<SendFormValues> = async (data) => {
    try {
      setPaymentSuccessfulInfoAlert(undefined)
      const result = await triggerNonCollarborativeTransaction.mutateAsync(data)
      const tx = result.response.txinfo as Required<JmTxInfo>

      const output = tx.outputs.find((output) => output.address === data.destination.address)
      setPaymentSuccessfulInfoAlert({
        variant: 'success',
        title: t('send.title'),
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

      // Refetch wallet info to update jar balances
      await refetchWalletInfo()
    } catch (error: unknown) {
      console.error('Error while sending non-collaborative transaction', error)
    }
  }

  const onSubmitCollaborativeSend = async (data: SendFormValues) => {
    if (data.source?.fromJar === undefined) {
      throw new Error('Cannot trigger collaborative transaction: Invalid source jar given.')
    }
    if (data.destination === undefined || !isValidBitcoinAddress(data.destination.address)) {
      throw new Error('Cannot trigger collaborative transaction: Invalid bitcoin address given.')
    }
    if (data.amount === undefined) {
      throw new Error('Cannot trigger collaborative transaction: Invalid amount given.')
    }
    if (data.numCollaborators === undefined || data.numCollaborators < 1) {
      throw new Error('Cannot trigger collaborative transaction: Invalid number of collaborators.')
    }

    try {
      await coinjoinMutation.mutateAsync({
        path: {
          walletname: encodeURIComponent(walletFileName),
        },
        body: {
          mixdepth: data.source.fromJar,
          amount_sats: data.amount.isSweep === true ? 0 : (data.amount.amount ?? 0),
          counterparties: data.numCollaborators,
          destination: data.destination.address,
        },
      })
    } catch (error: unknown) {
      console.error('Error while sending collaborative transaction', error)
    }
  }

  const onPaymentConfirmed: SubmitHandler<SendFormValues> = async (data) => {
    if (data.isCoinJoin !== true) {
      await onSubmitDirectSend(data)
    } else {
      await onSubmitCollaborativeSend(data)
    }
  }

  const onSubmit: SubmitHandler<SendFormValues> = (data) => {
    setSendFromValuesAwaitingConfirmation(data)
    setShowPaymentConfirmDialog(true)
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

        {singleCoinJoinRunning && (
          <Alert variant="warning">
            <HourglassIcon />
            <AlertDescription className="flex items-center justify-between">
              <span>{t('send.text_coinjoin_already_running')}</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isWaitingCoinjoinStop}
                onClick={() => stopCoinjoinMutation.mutate()}
              >
                {isWaitingCoinjoinStop ? (
                  <>
                    <Spinner className="motion-reduce:hidden" />
                    {t('send.confirm_abort_modal.title')}
                  </>
                ) : (
                  t('send.confirm_abort_modal.title')
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {makerRunning && !singleCoinJoinRunning && (
          <Alert variant="warning">
            <HourglassIcon />
            <AlertDescription>{t('send.text_maker_running')}</AlertDescription>
          </Alert>
        )}

        {isWaitingCoinjoinStart && (
          <Alert>
            <Spinner className="motion-reduce:hidden" />
            <AlertTitle>{t('send.text_sending')}</AlertTitle>
          </Alert>
        )}

        {triggerNonCollarborativeTransaction.error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{t('global.error')}</AlertTitle>
            <AlertDescription>
              <p>{t('send.direct_payment_error_message_bad_request')}</p>
              <p className="mt-1 font-mono text-sm">
                {triggerNonCollarborativeTransaction.error.message}
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {paymentSuccessfulInfoAlert && (
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
                    <AlertTitle>{t('send.text_sending')}</AlertTitle>
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        <Card>
          <CardContent>
            <SendForm
              onSubmit={onSubmit}
              walletFileName={walletFileName}
              minNumberOfCollaborators={undefined}
              jars={jars}
              addressSummary={addressSummary}
              walletBalanceSummary={walletBalanceSummary}
              disabled={
                makerRunning ||
                singleCoinJoinRunning ||
                jmSession?.rescanning ||
                waitForUtxosToBeSpent.length > 0 ||
                isWaitingCoinjoinStart ||
                isWaitingCoinjoinStop
              }
              debug={isDeveloperMode}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
