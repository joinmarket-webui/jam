import { useEffect, useMemo, useState } from 'react'
import { startmakerMutation, stopmakerOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { StartMakerRequest } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileTextIcon, HourglassIcon, PlusIcon, RefreshCwIcon, ShuffleIcon, UnlockIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { DevBadge } from '@/components/dev/DevBadge'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from '@/components/ui/jam/PageTitle'
import { isDevMode } from '@/constants/debugFeatures'
import * as JAM from '@/constants/jam'
import { useJamWalletInfoContext } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import * as OrderbookApi from '@/lib/api/orderbook'
import { getErrorReason } from '@/lib/errorReason'
import * as fb from '@/lib/fidelityBondUtils'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, isAbsoluteOffer, isRelativeOffer, percentageToFactor, scrollToTop } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { useDeveloperMode } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Spinner } from '../ui/spinner'
import { CreateFidelityBondDialog } from './CreateFidelityBondDialog'
import { EarnForm, type EarnFormValues } from './EarnForm'
import { NonFrozenFidelityBondsAlert, NoSpendableBalanceAlert, UnconfirmedBalanceAlert } from './EarnPreconditionAlerts'
import { FidelityBondCard } from './FidelityBondCard'
import { MoveToJarDialog } from './MoveToJarDialog'
import { OfferCard } from './OfferCard'
import { RenewBondDialog } from './RenewBondDialog'
import { EarnReportOverlay } from './report/EarnReportOverlay'

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

const JAM_EARN_CREATE_MULTIPLE_FIDELITY_BONDS_ENABLED = isDevMode()

export const EarnPage = ({ walletFileName }: EarnPageProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const { enabled: isDeveloperMode } = useDeveloperMode()
  const makerRunning = jmSession?.maker_running === true

  const walletInfo = useJamWalletInfoContext()
  const feeConfigValidation = useFeeConfigValidation({ walletFileName })
  const maxConfirmedJarAvailableBalance = useMemo(() => {
    return Math.max(0, ...walletInfo.jars.map((jar) => jar.balanceSummary.calculatedConfirmedAvailableBalanceInSats))
  }, [walletInfo.jars])

  const [moveToJarUtxo, setMoveToJarUtxo] = useState<FidelityBondUtxo | undefined>()
  const [renewBondUtxo, setRenewBondUtxo] = useState<FidelityBondUtxo | undefined>()
  const [showCreateFidelityBondDialog, setShowCreateFidelityBondDialog] = useState(false)
  const [showEarnReport, setShowEarnReport] = useState(false)

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const isCurrentOfferAvailable = jmSession?.offer_list && jmSession.offer_list.length > 0
  const currentOffer = jmSession?.offer_list?.[0]
  const isCurrentOrderbookOffer = (offer: OrderbookApi.OrderbookOffer) =>
    offer.counterparty === jmSession?.nickname && String(offer.oid) === String(currentOffer?.oid)

  const {
    data: orderbookData,
    isFetching: orderbookIsFetching,
    isError: orderbookIsError,
  } = useQuery({
    queryKey: ['orderbook'],
    queryFn: withQueryDelay(OrderbookApi.fetchOrderbook, {
      // avoid flickering and let user briefly know that something is happening in the background
      delayBefore: 1_000,
    }),
    enabled: makerRunning && !!currentOffer && !!jmSession?.nickname,
    staleTime: Number.POSITIVE_INFINITY,
    refetchInterval: (query) =>
      query.state.error || !query.state.data?.offers.some((offer) => isCurrentOrderbookOffer(offer))
        ? JAM.WAIT_FOR_UPDATE_ORDERBOOK_POLLING_INTERVAL
        : JAM.VISIBLE_ORDERBOOK_POLLING_INTERVAL,
  })
  const currentOrderbookOffer = orderbookData?.offers.find((offer) => isCurrentOrderbookOffer(offer))
  const currentOrderbookFidelityBond =
    Number(currentOrderbookOffer?.fidelity_bond_value) > 0
      ? orderbookData?.fidelitybonds?.findLast((bond) => bond.counterparty === jmSession?.nickname)
      : undefined
  const orderbookStatus =
    !jmSession?.nickname || orderbookIsFetching
      ? 'checking'
      : orderbookIsError
        ? 'error'
        : currentOrderbookOffer
          ? 'visible'
          : 'missing'

  const stopMakerQueryOptions = stopmakerOptions({
    client,
    path: { walletname: walletFileName },
  })

  const stopMakerQuery = useQuery({
    ...stopMakerQueryOptions,
    queryFn: withQueryDelay(stopMakerQueryOptions.queryFn, {
      delayAfter: JAM.MAKER_STOP_RESPONSE_DELAY,
    }),
    enabled: false,
    retry: false,
  })

  // wrap as mutation manually, as `stopMakerQuery` is a `GET` request
  const stopMaker = useMutation({
    mutationFn: async () => {
      return await stopMakerQuery.refetch({ throwOnError: true })
    },
    retry: false,
    onMutate: () => {
      toast.info(t('earn.alert_stopping'), { id: 'earn.alert_stopping' })
    },
    onError: (error: unknown) => {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('earn.error_stopping_earn', { reason }))
    },
  })

  const startMaker = useMutation({
    ...startmakerMutation({ client }),
    retry: false,
    onMutate: () => {
      toast.info(t('earn.alert_starting'), { id: 'earn.alert_starting' })
    },
    onError: (error) => {
      console.error('StartMaker error:', error)
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('earn.alert_start_failed', { reason }))
    },
  })

  const isWaitingMakerStart = startMaker.isPending || (startMaker.isSuccess && !makerRunning)
  const isWaitingMakerStop = stopMaker.isPending || (stopMaker.isSuccess && makerRunning)

  const waitingForMakerUpdate = isWaitingMakerStart || isWaitingMakerStop
  const waitingForOfferUpdate = makerRunning && !isCurrentOfferAvailable

  const hasFidelityBond = walletInfo.fidelityBondSummary.fbOutputs.length > 0
  const isFidelityBondActionsEnabled =
    jmSession?.rescanning === false &&
    jmSession.maker_running === false &&
    jmSession.coinjoin_in_process === false &&
    !waitingForMakerUpdate &&
    !waitingForOfferUpdate &&
    !walletInfo.isFetching

  const isCreateFidelityBondEnabled =
    isFidelityBondActionsEnabled && (!hasFidelityBond || JAM_EARN_CREATE_MULTIPLE_FIDELITY_BONDS_ENABLED)
  const showCreateAdditionalFidelityBond = JAM_EARN_CREATE_MULTIPLE_FIDELITY_BONDS_ENABLED

  const numberOfNonFrozenFidelityBondOutputs = !hasFidelityBond
    ? 0
    : walletInfo.fidelityBondSummary.fbOutputs.filter((it) => it.frozen !== true).length

  const earnPreconditionWarning =
    numberOfNonFrozenFidelityBondOutputs > 0
      ? 'non-frozen-fb-present'
      : !walletInfo.isFetching && maxConfirmedJarAvailableBalance < JAM.OFFER_MINSIZE_MIN
        ? walletInfo.maxJarAvailableBalance >= JAM.OFFER_MINSIZE_MIN
          ? 'missing-utxos'
          : 'missing-confirmations'
        : undefined

  useRefreshSession({
    enabled: waitingForMakerUpdate || waitingForOfferUpdate,
    refetchInterval: JAM.WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL,
    refetchDelay: JAM.WAIT_FOR_UPDATE_SESSION_POLLING_DELAY,
  })

  const onStop = async () => {
    startMaker.reset()
    await stopMaker.mutateAsync()
  }

  const onSubmit: SubmitHandler<EarnFormValues> = async (data) => {
    stopMaker.reset()
    await startMaker.mutateAsync({
      path: {
        walletname: walletFileName,
      },
      body: toStartMakerRequest(data),
    })
    scrollToTop()
  }

  useEffect(() => {
    if (!jmSession || !startMaker.isSuccess || !makerRunning) return
    toast.dismiss('earn.alert_starting')
    toast.dismiss('earn.alert_stopping')
    toast.dismiss('earn.alert_stopped')
    toast.success(t('earn.alert_running'), { id: 'earn.alert_running' })
  }, [jmSession, makerRunning, startMaker.isSuccess, t])

  useEffect(() => {
    if (!jmSession || !stopMaker.isSuccess || makerRunning) return
    toast.dismiss('earn.alert_stopping')
    toast.dismiss('earn.alert_starting')
    toast.dismiss('earn.alert_running')
    toast.success(t('earn.alert_stopped'), { id: 'earn.alert_stopped' })
  }, [jmSession, makerRunning, stopMaker.isSuccess, t])

  if (!jmSession || walletInfo.isLoading) {
    return <PageLoading />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={t('earn.title')} subtitle={t('earn.subtitle')} />

      {feeConfigValidation.maxFeesConfigMissing && (
        <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mb-4" />
      )}

      {jmSession.coinjoin_in_process === true && (
        <Alert variant="warning">
          <HourglassIcon className="motion-safe:animate-pulse" />
          <AlertTitle>{t('send.text_coinjoin_already_running')}</AlertTitle>
        </Alert>
      )}

      {jmSession.maker_running === true && (
        <Alert variant="success" className="motion-safe:animate-in blur-in my-2">
          <ShuffleIcon className="motion-safe:animate-pulse" />
          <AlertTitle>{t('earn.alert_running')}</AlertTitle>
        </Alert>
      )}
      {isWaitingMakerStart && (
        <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
          <Spinner className="motion-reduce:hidden" />
          <AlertTitle>{t('earn.alert_waiting_start_title')}</AlertTitle>
        </Alert>
      )}
      {isWaitingMakerStop && (
        <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
          <Spinner className="motion-reduce:hidden" />
          <AlertTitle>{t('earn.alert_waiting_stop_title')}</AlertTitle>
        </Alert>
      )}
      {waitingForOfferUpdate && (
        <Alert variant="default" className="motion-safe:animate-in blur-in my-2">
          <Spinner className="motion-reduce:hidden" />
          <AlertTitle>{t('earn.alert_loading_offer')}</AlertTitle>
        </Alert>
      )}

      {!isWaitingMakerStart && !isWaitingMakerStop && !jmSession.maker_running && earnPreconditionWarning && (
        <>
          {earnPreconditionWarning === 'non-frozen-fb-present' ? (
            <NonFrozenFidelityBondsAlert numberOfNonFrozenFidelityBondOutputs={numberOfNonFrozenFidelityBondOutputs} />
          ) : null}
          {earnPreconditionWarning === 'missing-utxos' ? (
            <UnconfirmedBalanceAlert numberOfMissingConfirmations={1} />
          ) : null}
          {earnPreconditionWarning === 'missing-confirmations' ? <NoSpendableBalanceAlert /> : null}
        </>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setShowEarnReport(true)}>
          <FileTextIcon />
          {t('earn.button_show_report')}
        </Button>
      </div>

      {jmSession.offer_list && jmSession.offer_list.length > 0 && (
        <OfferCard
          className="motion-safe:animate-in blur-in"
          value={jmSession.offer_list[0]}
          nickname={jmSession.nickname}
          orderbookStatus={orderbookStatus}
          orderbookOffer={currentOrderbookOffer}
          fidelityBond={currentOrderbookFidelityBond}
        >
          <Button type="button" onClick={() => void onStop()} className="w-full" size="lg">
            {isWaitingMakerStop ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('earn.text_stopping')}
              </>
            ) : (
              <>{t('earn.button_stop')}</>
            )}
          </Button>
        </OfferCard>
      )}

      {/* Earn Form */}
      <Card
        className={cn({
          hidden: jmSession.maker_running && !waitingForOfferUpdate,
          'blur-[2px]': isWaitingMakerStop || waitingForOfferUpdate,
        })}
      >
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.market_explainer')}</p>

          <EarnForm
            onSubmit={onSubmit}
            isWaitingMakerStart={isWaitingMakerStart}
            offerMinsizeMax={maxConfirmedJarAvailableBalance}
            disabled={
              earnPreconditionWarning !== undefined ||
              walletInfo.isFetching ||
              isWaitingMakerStart ||
              isWaitingMakerStop ||
              jmSession.maker_running ||
              jmSession.coinjoin_in_process ||
              jmSession.rescanning
            }
            debug={isDeveloperMode}
          />
        </CardContent>
      </Card>

      {/* Fidelity Bonds */}
      {!hasFidelityBond ? (
        <div
          className={cn('mt-8', {
            hidden: jmSession.maker_running || waitingForMakerUpdate || waitingForOfferUpdate,
          })}
        >
          {/* Fidelity Bonds missing */}
          <h2 className="my-2 text-xl font-semibold tracking-tight">{t('earn.title_fidelity_bonds', { count: 0 })}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle_fidelity_bonds')}</p>
          <Card>
            <CardHeader>
              <CardTitle>{t('earn.fidelity_bond.title')}</CardTitle>
              <CardDescription>{t('earn.fidelity_bond.subtitle')}</CardDescription>
              <CardAction></CardAction>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button
                variant="default"
                disabled={!isCreateFidelityBondEnabled}
                onClick={() => setShowCreateFidelityBondDialog(true)}
              >
                {t('earn.fidelity_bond.create_form.button_create')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="mt-8">
          {/* Fidelity Bonds exist */}
          <h2 className="my-2 text-xl font-semibold tracking-tight">
            {t('earn.title_fidelity_bonds', { count: walletInfo.fidelityBondSummary.fbOutputs.length })}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle_fidelity_bonds')}</p>
          <div className="space-y-4">
            {walletInfo.fidelityBondSummary.fbOutputs.map((it) => {
              const isExpired = !fb.utxo.isLocked(it)
              const actionsEnabled = isExpired && isFidelityBondActionsEnabled
              return (
                <FidelityBondCard value={it} key={it.utxo}>
                  {isExpired && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setMoveToJarUtxo(it)}
                        disabled={!actionsEnabled}
                      >
                        <UnlockIcon />
                        {t('earn.fidelity_bond.existing.button_spend')}
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => setRenewBondUtxo(it)}
                        disabled={!actionsEnabled}
                      >
                        <RefreshCwIcon />
                        {t('earn.fidelity_bond.existing.button_renew')}
                      </Button>
                    </div>
                  )}
                </FidelityBondCard>
              )
            })}
          </div>

          {showCreateAdditionalFidelityBond && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                disabled={!isCreateFidelityBondEnabled}
                onClick={() => setShowCreateFidelityBondDialog(true)}
              >
                <PlusIcon />
                {t('earn.fidelity_bond.create_form.button_create')}
              </Button>
              <DevBadge />
            </div>
          )}
        </div>
      )}

      {/* Fee Configuration Dialog */}
      <FeeConfigDialog
        walletFileName={walletFileName}
        feeConfigValidation={feeConfigValidation}
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
      />

      {/* Create Fidelity Bond Dialog */}
      <CreateFidelityBondDialog
        open={showCreateFidelityBondDialog}
        onOpenChange={setShowCreateFidelityBondDialog}
        walletFileName={walletFileName}
      />

      {/* Move Expired Bond to Jar Dialog */}
      {moveToJarUtxo && (
        <MoveToJarDialog
          open={!!moveToJarUtxo}
          onOpenChange={(open) => !open && setMoveToJarUtxo(undefined)}
          walletFileName={walletFileName}
          utxo={moveToJarUtxo}
        />
      )}

      {/* Renew Expired Bond Dialog */}
      {renewBondUtxo && (
        <RenewBondDialog
          open={!!renewBondUtxo}
          onOpenChange={(open) => !open && setRenewBondUtxo(undefined)}
          walletFileName={walletFileName}
          utxo={renewBondUtxo}
        />
      )}

      {isDeveloperMode && (
        <Card className="mt-8">
          <CardHeader className="grid">
            <DevBadge className="justify-self-end" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="overflow-scroll">
              <code className="text-destructive">walletInfo.fidelityBondSummary.fbOutputs:</code>
              <pre className="text-xs">{JSON.stringify(walletInfo.fidelityBondSummary.fbOutputs, null, 2)}</pre>
            </div>
            <div className="mt-8 overflow-scroll">
              <code className="text-destructive">jmSessionState.offer_list:</code>
              <pre className="text-xs">{JSON.stringify(jmSession.offer_list, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <EarnReportOverlay open={showEarnReport} onOpenChange={setShowEarnReport} />
    </div>
  )
}
