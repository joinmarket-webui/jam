import { useMemo, useState } from 'react'
import { directsendMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { DirectSendRequest, DirectSendResponse, ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import { AlertTriangleIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import PageTitle from '@/components/ui/jam/PageTitle'
import { useAddressSummary, useJars, useWalletBalanceSummary } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { UtxoId } from '@/hooks/useQueryUtxos'
import { useWaitForUtxosToBeSpent } from '@/hooks/useWaitForUtxosToBeSpent'
import type { WalletFileName } from '@/lib/utils'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import { Card, CardContent } from '../ui/card'
import { Spinner } from '../ui/spinner'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import { SendForm } from './SendForm'
import type { SendFormValues } from './types'

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
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false)
  const [sendFromValuesAwaitingConfirmation, setSendFromValuesAwaitingConfirmation] = useState<SendFormValues>()

  const { addressSummary } = useAddressSummary()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()

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
    onSuccess: () => {
      /* TODO: i18n */
      toast.success('Successfully sent non-collaborative transaction.')
    },
    onError: (error) => {
      /* TODO: i18n */
      toast.error(
        `Error while sending non-collaborative transaction: ${error.message || t('global.errors.reason_unknown')}`,
      )
    },
  })

  const onSubmitDirectSend: SubmitHandler<SendFormValues> = async (data) => {
    try {
      const result = await triggerNonCollarborativeTransaction.mutateAsync(data)
      jmTxStore.getState().add(result.response.txinfo as JmTxInfo)
      const inputUtxoIds = (result.response.txinfo.inputs || []).flatMap((it) =>
        it?.outpoint !== undefined ? [it.outpoint as UtxoId] : [],
      )
      setWaitForUtxosToBeSpent(inputUtxoIds)
    } catch (error: unknown) {
      console.error('Error while sending non-collaborative transaction', error)
    }
  }

  const onPaymentConfirmed: SubmitHandler<SendFormValues> = async (data) => {
    console.table(data)
    if (data.isCoinJoin !== true) {
      await onSubmitDirectSend(data)
    } else {
      // TODO: implement sending collaborative transactions
      console.warn('Sending collaborative transactions is not implemented yet.')
      toast.error(`Sending collaborative transactions is not implemented yet.`)
    }
  }

  const onSubmit: SubmitHandler<SendFormValues> = (data) => {
    setSendFromValuesAwaitingConfirmation(data)
    setShowPaymentConfirmDialog(true)
  }

  if (isLoadingFeeConfig) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="m-2 flex items-center justify-center gap-2">
          <Spinner className="motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      </div>
    )
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

        {/* Send Form Placeholder */}
        <Alert variant="warning">
          <AlertTriangleIcon />
          <AlertTitle>Under construction</AlertTitle>
          <AlertDescription>
            Not yet fully implemented.
            {maxFeesConfigMissing && (
              <span className="mt-2 block">
                <strong>Note:</strong> Fee configuration is required before earning with collaborative transactions.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {triggerNonCollarborativeTransaction.error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{/* TODO: i18n */}Error while sending non-collaborative transaction</AlertTitle>
            <AlertDescription className="">
              <p>
                The exact reason is not entirely clear, only the following is known:{' '}
                <span className="inline font-mono font-semibold">
                  "{triggerNonCollarborativeTransaction.error.message}"
                </span>
                <br />
              </p>
              <p>Please validate your inputs and try again.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {triggerNonCollarborativeTransaction.data && (
              <Alert variant="success">
                <AlertTriangleIcon />
                <AlertTitle>{/* TODO: i18n */}Successfully sent non-collaborative transaction</AlertTitle>
                <AlertDescription>
                  <span className="text-wrap slashed-zero">
                    {t('send.alert_payment_successful', {
                      amount: triggerNonCollarborativeTransaction.data.request.amount_sats,
                      address: triggerNonCollarborativeTransaction.data.request.destination,
                      txid: triggerNonCollarborativeTransaction.data.response.txinfo.txid,
                    })}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Earn Form */}
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
                jmSession?.maker_running ||
                jmSession?.coinjoin_in_process ||
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
