import { useId, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { startmakerMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, StartMakerRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, HandshakeIcon, PercentIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
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
import { factorToPercentage, isAbsoluteOffer, isRelativeOffer, percentageToFactor } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { SatSymbol } from '../CurrencySymbol'

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
  onSubmit: SubmitHandler<Inputs>
  disabled?: boolean
}

function EarnForm({ onSubmit, disabled }: EarnFormProps) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <OfferTypeInput
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
      <Button type="submit" disabled={disabled || !isValid || isSubmitting} className="w-full" size="lg">
        {isSubmitting ? t('earn.text_starting') : t('earn.button_start')}
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
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const { maxFeesConfigMissing } = useFeeConfigValidation({ walletFileName })

  const startMaker = useMutation({
    ...startmakerMutation({ client }),
    retry: false,
    onSuccess: () => {
      // TODO: i18n
      toast.info('Service is starting')
    },
    onError: (error: ErrorMessage) => {
      console.error('StartMaker error:', error)
      const reason = error.message ?? error.error_description ?? t('global.errors.reason_unknown')
      // TODO: i18n
      toast.error(`Error while starting the maker process. Reason: ${reason}}`)
    },
  })

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

      <EarnForm onSubmit={onSubmit} />

      {/* Fee Configuration Dialog */}
      <FeeLimitDialog
        open={showFeeConfigDialog}
        onOpenChange={setShowFeeConfigDialog}
        walletFileName={walletFileName}
      />
    </div>
  )
}
