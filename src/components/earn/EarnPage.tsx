import { useId, useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { startmakerMutation, stopmakerOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, StartMakerRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, HandshakeIcon, Loader2Icon, PercentIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { FeeConfigErrorAlert } from '@/components/ui/FeeConfigErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { OFFER_FEE_ABS_MIN, OFFER_FEE_REL_MIN, OFFER_MINSIZE_MIN } from '@/constants/jam'
import type { OfferType } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { useRefreshSession } from '@/hooks/useRefreshSession'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, factorToPercentage, isAbsoluteOffer, isRelativeOffer, percentageToFactor } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { Milliseconds } from '@/types/global'
import { SatSymbol } from '../CurrencySymbol'

// In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
// Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
// There is currently no way to know for sure - adding a delay at least mitigates the problem.
// 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
const MAKER_STOP_RESPONSE_DELAY: Milliseconds = 2_000

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

const OFFERTYPE_ABS: OfferType = 'sw0absoffer'
const OFFERTYPE_REL: OfferType = 'sw0reloffer'

interface Inputs {
  offerType: OfferType
  offerAbsoluteFee?: number
  offerRelativeFee?: number
  offerMinAmount: number
}

const FORM_INPUT_DEFAULT_VALUES: Required<Inputs> = {
  offerType: OFFERTYPE_ABS,
  offerRelativeFee: 0.03,
  offerAbsoluteFee: 250,
  offerMinAmount: 100_000,
}

const schema = yup
  .object()
  .shape({
    offerType: yup.string<OfferType>().default(FORM_INPUT_DEFAULT_VALUES.offerType).required(),
    offerAbsoluteFee: yup.number().integer().min(OFFER_FEE_ABS_MIN).optional(),
    offerRelativeFee: yup.number().min(factorToPercentage(OFFER_FEE_REL_MIN)).optional(),
    offerMinAmount: yup.number().integer().min(OFFER_MINSIZE_MIN).required(),
  })
  .required()

const OfferTypeInput = (props: React.ComponentProps<typeof RadioGroup>) => {
  const { t } = useTranslation()
  const id = useId()

  return (
    <RadioGroup className="w-full max-w-96 justify-items-center sm:grid-cols-2" {...props}>
      <div className="border-input has-data-[state=checked]:border-primary/50 relative flex w-full max-w-50 cursor-pointer flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none">
        <RadioGroupItem
          value={OFFERTYPE_ABS}
          id={`${id}-sw0absoffer`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-2">
          <HandshakeIcon />
          <Label htmlFor={`${id}-sw0absoffer`} className="justify-center">
            {t('earn.radio_abs_offer_label')}
          </Label>
        </div>
      </div>
      <div className="border-input has-data-[state=checked]:border-primary/50 relative flex w-full max-w-50 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none">
        <RadioGroupItem
          value={OFFERTYPE_REL}
          id={`${id}-sw0reloffer`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-2">
          <PercentIcon />
          <Label htmlFor={`${id}-sw0reloffer`} className="justify-center">
            {t('earn.radio_rel_offer_label')}
          </Label>
        </div>
      </div>
    </RadioGroup>
  )
}
interface EarnFormProps {
  className?: string
  isWaitingMakerStart: boolean
  onSubmit: SubmitHandler<Inputs>
  disabled?: boolean
}

function EarnForm({ className, isWaitingMakerStart, onSubmit, disabled }: EarnFormProps) {
  const { t } = useTranslation()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    getValues,
    setValue,
  } = useForm<Inputs, unknown, Inputs>({
    mode: 'all',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<Inputs, unknown, Inputs>,
  })

  const watchOfferType = useWatch({ control, name: 'offerType' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
      <OfferTypeInput
        disabled={disabled}
        defaultValue={FORM_INPUT_DEFAULT_VALUES.offerType}
        onValueChange={(value) => {
          setValue('offerType', value, {
            shouldValidate: true, // trigger validation
            shouldTouch: true, // update touched fields form state
            shouldDirty: true, // update dirty and dirty fields form state
          })
        }}
      />
      <Tabs value={watchOfferType}>
        <TabsContent value={OFFERTYPE_ABS}>
          <div className="space-y-2">
            <Label htmlFor="rescanHeight" className="text-sm font-medium">
              {t('earn.label_abs_fee', {
                fee: '', // empty on purpose
              })}
            </Label>
            <p className="text-muted-foreground text-xs">{t('earn.description_abs_fee')}</p>
            <div className="relative">
              <div className="absolute top-1/2 left-3 -translate-y-1/2">{FieldPrefixSatSymbol}</div>

              <Input
                {...register('offerAbsoluteFee', {
                  disabled,
                })}
                type="number"
                step={1}
                className="bg-background pl-10"
                placeholder={t('earn.placeholder_min_amount_input')}
              />
            </div>
            {errors.offerMinAmount && (
              <div className="text-muted-foreground light:text-red-700 text-xs text-red-500">
                <span>ERROR</span>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value={OFFERTYPE_REL}>
          <div className="space-y-2">
            <Label htmlFor="rescanHeight" className="text-sm font-medium">
              {t('earn.label_rel_fee', {
                fee: getValues('offerRelativeFee') ? `(${getValues('offerRelativeFee')!}%)` : '',
              })}
            </Label>
            <p className="text-muted-foreground text-xs">{t('earn.description_rel_fee')}</p>
            <div className="relative">
              <div className="absolute top-1/2 left-3 -translate-y-1/2">%</div>

              <Input
                {...register('offerRelativeFee', {
                  disabled,
                })}
                type="number"
                step={0.0001}
                className="bg-background pl-10"
                placeholder={t('earn.placeholder_min_amount_input')}
              />
            </div>
            {errors.offerMinAmount && (
              <div className="text-muted-foreground light:text-red-700 text-xs text-red-500">
                <span>ERROR</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <div className="space-y-2">
        <Label htmlFor="rescanHeight" className="text-sm font-medium">
          {t('earn.label_min_amount_input')}
        </Label>
        <p className="text-muted-foreground text-xs">{t('rescan_chain.description_blockheight')}</p>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2">{FieldPrefixSatSymbol}</div>

          <Input
            {...register('offerMinAmount', {
              disabled,
            })}
            type="number"
            step={1}
            className="bg-background pl-10"
            placeholder={t('earn.placeholder_min_amount_input')}
          />
        </div>
        {errors.offerMinAmount && (
          <div className="text-muted-foreground light:text-red-700 text-xs text-red-500">
            <span>ERROR</span>
          </div>
        )}
      </div>
      <Button
        type="submit"
        variant={disabled && !isWaitingMakerStart ? 'outline' : undefined}
        disabled={disabled || !isValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting || isWaitingMakerStart ? (
          <>
            <Loader2Icon className="h-8 w-8 animate-spin text-gray-400 motion-reduce:hidden" />
            {t('earn.text_starting')}
          </>
        ) : (
          <>{t('earn.button_start')}</>
        )}
      </Button>
    </form>
  )
}

const toStartMakerRequest = (values: Inputs): StartMakerRequest => {
  // both fee properties need to be provided.
  // prevent providing an invalid value by setting the ignored prop to zero
  const cjfee_a = isAbsoluteOffer(values.offerType) ? values.offerAbsoluteFee! : 0
  const cjfee_r = isRelativeOffer(values.offerType) ? percentageToFactor(values.offerRelativeFee!) : 0
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

  const [isWaitingMakerStart, setIsWaitingMakerStart] = useState(false)
  const [isWaitingMakerStop, setIsWaitingMakerStop] = useState(false)

  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const { maxFeesConfigMissing } = useFeeConfigValidation({ walletFileName })

  useRefreshSession({
    enabled: isWaitingMakerStart || isWaitingMakerStop,
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

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
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

      <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
        <div className="flex items-start gap-2">
          <div className="light:text-yellow-800 text-sm text-yellow-200">
            <div className="flex items-center">
              <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
              <p className="text-md font-medium">Under construction</p>
            </div>
            <p className="p-1 text-xs">
              Not yet implemented.
              {maxFeesConfigMissing && (
                <span className="mt-2 block">
                  <strong>Note:</strong> Fee configuration is required before earning with collaborative transactions.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => onStop()}
        disabled={jmSessionState.maker_running !== true || isWaitingMakerStop}
        className={cn('w-full', {
          hidden: jmSessionState.maker_running !== true && !isWaitingMakerStop,
        })}
        size="lg"
      >
        {isWaitingMakerStop ? (
          <>
            <Loader2Icon className="h-8 w-8 animate-spin text-gray-400 motion-reduce:hidden" />
            {t('earn.text_stopping')}
          </>
        ) : (
          <>{t('earn.button_stop')}</>
        )}
      </Button>

      <EarnForm
        className={cn('w-full', {
          hidden: isWaitingMakerStop || jmSessionState.maker_running,
        })}
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

      {/* Fee Configuration Dialog */}
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
