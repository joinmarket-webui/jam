import { useMemo, useState } from 'react'
import { startmakerMutation, stopmakerOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, StartMakerRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon, ShuffleIcon, UnlockIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { Button } from '@/components/ui/button'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { isDevMode } from '@/constants/debugFeatures'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import type { UtxoId } from '@/hooks/useUtxos'
import * as fb from '@/lib/fidelityBondUtils'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, isAbsoluteOffer, isRelativeOffer, percentageToFactor } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { Milliseconds } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { EarnForm, type EarnFormValues } from './EarnForm'
import { FidelityBondCard } from './FidelityBondCard'
import { OfferCard } from './OfferCard'

// In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
// Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
// There is currently no way to know for sure - adding a delay at least mitigates the problem.
// 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
const MAKER_STOP_RESPONSE_DELAY: Milliseconds = 2_000

const toStartMakerRequest = (values: EarnFormValues): StartMakerRequest => {
  // both fee properties need to be provided.
  // prevent providing an invalid value by setting the ignored prop to zero
  const cjfee_a = isAbsoluteOffer(values.offerType) ? values.offerAbsoluteFee! : 0
  const cjfee_r = isRelativeOffer(values.offerType) ? percentageToFactor(values.offerRelativeFeeInPercent!) : 0
  return {
    ordertype: values.offerType,
    minsize: String(values.offerMinAmount),
    cjfee_a: String(cjfee_a),
    cjfee_r: String(cjfee_r),
    txfee: String(0), // hardcoded on purpose: unused but must be present
  }
}

interface EarnPageProps {
  walletFileName: WalletFileName
}

export const EarnPage = ({ walletFileName }: EarnPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)
  const walletInfo = useJamWalletInfoContext()

  const [isWaitingMakerStart, setIsWaitingMakerStart] = useState(false)
  const [isWaitingMakerStop, setIsWaitingMakerStop] = useState(false)

  const [moveToJarFidelityBondId, setMoveToJarFidelityBondId] = useState<UtxoId>()
  const [renewFidelityBondId, setRenewFidelityBondId] = useState<UtxoId>()

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const { maxFeesConfigMissing } = useFeeConfigValidation({ walletFileName })

  const isCurrentOfferAvailable = jmSessionState?.offer_list && jmSessionState.offer_list.length > 0
  const waitingForMakerUpdate = isWaitingMakerStart || isWaitingMakerStop
  const waitingForOfferUpdate = jmSessionState?.maker_running === true && !isCurrentOfferAvailable
  useRefreshSession({
    enabled: waitingForMakerUpdate || waitingForOfferUpdate,
    refetchInterval: 3_000,
    refetchDelay: 1_000,
  })

  const stopMakerQueryOptions = useMemo(
    () =>
      stopmakerOptions({
        client,
        path: { walletname: encodeURIComponent(walletFileName) },
      }),
    [client, walletFileName],
  )

  const stopMakerQuery = useQuery({
    ...stopMakerQueryOptions,
    queryFn: withQueryDelay(stopMakerQueryOptions.queryFn, {
      delayAfter: MAKER_STOP_RESPONSE_DELAY,
    }),
    staleTime: 1,
    gcTime: 1,
    enabled: false,
    retry: false,
  })

  const startMaker = useMutation({
    ...startmakerMutation({ client }),
    retry: false,
    onSuccess: () => {
      setIsWaitingMakerStart(true)
      toast.info(t('earn.alert_starting'), { id: 'earn.alert_starting' })
    },
    onError: (error: ErrorMessage) => {
      setIsWaitingMakerStart(false)
      console.error('StartMaker error:', error)
      const reason = error.message ?? error.error_description ?? t('global.errors.reason_unknown')
      // TODO: i18n
      toast.error(`Error while starting the maker process. Reason: ${reason}}`)
    },
  })

  const onStop = async () => {
    try {
      toast.info(t('earn.alert_stopping'), { id: 'earn.alert_stopping' })
      await stopMakerService()
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : undefined
      toast.error(reason ?? t('global.errors.reason_unknown'))
    }
  }

  const stopMakerService = async () => {
    setIsWaitingMakerStop(true)
    try {
      await stopMakerQuery.refetch()
    } catch (e) {
      setIsWaitingMakerStop(false)
      throw e
    }
  }

  const onSubmit: SubmitHandler<EarnFormValues> = async (data) => {
    return await startMaker.mutateAsync({
      path: {
        walletname: encodeURIComponent(walletFileName),
      },
      body: toStartMakerRequest(data),
    })
  }

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('earn.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }

  if (!jmSessionState) {
    return (
      <div className="m-2 flex items-center justify-center">
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin motion-reduce:hidden" />
        {t('global.loading')}
      </div>
    )
  }

  const makerRunning = jmSessionState.maker_running === true
  if (makerRunning) {
    if (isWaitingMakerStart && !startMaker.isPending) {
      setIsWaitingMakerStart(false)
      toast.dismiss('earn.alert_starting')
      toast.dismiss('earn.alert_stopping')
      toast.dismiss('earn.alert_stopped')
      toast.success(t('earn.alert_running'), { id: 'earn.alert_running' })
    }
  } else {
    if (isWaitingMakerStop && !stopMakerQuery.isFetching) {
      setIsWaitingMakerStop(false)
      toast.dismiss('earn.alert_stopping')
      toast.dismiss('earn.alert_starting')
      toast.dismiss('earn.alert_running')
      // TODO: i18n!
      toast.success('Service successfully stopped.', { id: 'earn.alert_stopped' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('earn.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle')}</p>

      {/* Fee Config Error Alert */}
      {maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      {jmSessionState.maker_running === true && (
        <Alert variant="success" className="animate-in blur-in my-2">
          <ShuffleIcon className="animate-pulse motion-reduce:hidden" />
          <AlertTitle>{t('earn.alert_running')}</AlertTitle>
        </Alert>
      )}
      {waitingForOfferUpdate && (
        <Alert variant="default" className="animate-in blur-in my-2">
          <Loader2Icon className="animate-spin motion-reduce:hidden" />
          <AlertTitle>{/* TODO: i18n*/ t('Loading offer...')}</AlertTitle>
        </Alert>
      )}

      {jmSessionState.offer_list && jmSessionState.offer_list.length > 0 && (
        <>
          <div className="animate-in blur-in space-y-2">
            <OfferCard value={jmSessionState.offer_list[0]} nickname={jmSessionState.nickname}>
              <Button type="button" onClick={() => onStop()} className="w-full" size="lg">
                {isWaitingMakerStop ? (
                  <>
                    <Loader2Icon className="h-8 w-8 animate-spin text-gray-400 motion-reduce:hidden" />
                    {t('earn.text_stopping')}
                  </>
                ) : (
                  <>{t('earn.button_stop')}</>
                )}
              </Button>
            </OfferCard>
          </div>
        </>
      )}

      {/* Earn Form */}
      <Card
        className={cn({
          hidden: jmSessionState.maker_running && !waitingForOfferUpdate,
          'blur-[2px]': isWaitingMakerStop || waitingForOfferUpdate,
        })}
      >
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.market_explainer')}</p>

          <EarnForm
            onSubmit={onSubmit}
            isWaitingMakerStart={isWaitingMakerStart}
            disabled={
              isWaitingMakerStart ||
              isWaitingMakerStop ||
              jmSessionState.maker_running ||
              jmSessionState.coinjoin_in_process ||
              jmSessionState.rescanning
            }
          />
        </CardContent>
      </Card>

      {/* Fidelity Bonds */}
      {walletInfo.fidelityBondSummary.fbOutputs.length === 0 ? (
        <div
          className={cn({
            hidden: jmSessionState.maker_running || waitingForMakerUpdate || waitingForOfferUpdate,
          })}
        >
          {/* Fidelity Bonds missing */}
          <h2 className="my-2 text-xl font-semibold tracking-tight">{t('earn.title_fidelity_bonds', { count: 0 })}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle_fidelity_bonds')}</p>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t('earn.fidelity_bond.title')}</CardTitle>
              <CardDescription>{t('earn.fidelity_bond.subtitle')}</CardDescription>
              <CardAction></CardAction>
            </CardHeader>
            <CardContent>
              <Alert variant="warning">
                <AlertTriangleIcon />
                <AlertTitle>Under construction</AlertTitle>
                <AlertDescription>Not yet completely implemented.</AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="default" disabled>
                {/*TODO: i18n*/}
                Create Fidelity Bond
              </Button>
              <Button variant="ghost" disabled>
                {/*TODO: i18n*/}
                Learn more
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <>
          {/* Fidelity Bonds exist */}
          <h2 className="my-2 text-xl font-semibold tracking-tight">
            {t('earn.title_fidelity_bonds', { count: walletInfo.fidelityBondSummary.fbOutputs.length })}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle_fidelity_bonds')}</p>
          <div className="flex flex-col gap-2">
            {walletInfo.fidelityBondSummary.fbOutputs.map((it, index) => {
              const isExpired = !fb.utxo.isLocked(it)
              const actionsEnabled =
                isExpired &&
                !jmSessionState.rescanning &&
                !jmSessionState.maker_running &&
                !waitingForMakerUpdate &&
                !waitingForOfferUpdate &&
                !walletInfo.isLoading
              return (
                <FidelityBondCard value={it} key={index}>
                  {actionsEnabled && (
                    <>
                      <Alert variant="warning" className="mb-2">
                        <AlertTriangleIcon />
                        <AlertTitle>Under construction</AlertTitle>
                        <AlertDescription>Not yet completely implemented.</AlertDescription>
                      </Alert>
                      <div className="flex w-full flex-row gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          disabled={moveToJarFidelityBondId !== undefined}
                          onClick={() => setMoveToJarFidelityBondId(it.utxo)}
                        >
                          <UnlockIcon />
                          {t('earn.fidelity_bond.existing.button_spend')}
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1"
                          disabled={renewFidelityBondId !== undefined}
                          onClick={() => setRenewFidelityBondId(it.utxo)}
                        >
                          <RefreshCwIcon />
                          {t('earn.fidelity_bond.existing.button_renew')}
                        </Button>
                      </div>
                    </>
                  )}
                </FidelityBondCard>
              )
            })}
          </div>
        </>
      )}

      {/* Fee Configuration Dialog */}
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />

      {isDevMode() && (
        <Card className="mt-8">
          <CardHeader className="grid">
            <DevBadge className="justify-self-end" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">walletInfo.fidelityBondSummary.fbOutputs:</code>
              <pre className="text-xs">{JSON.stringify(walletInfo.fidelityBondSummary.fbOutputs, null, 2)}</pre>
            </div>
            <div className="mt-8 overflow-scroll">
              <code className="light:text-red-700 text-red-800">jmSessionState.offer_list:</code>
              <pre className="text-xs">{JSON.stringify(jmSessionState.offer_list, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
