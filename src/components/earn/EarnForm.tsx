import { useId } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { HandshakeIcon, Loader2Icon, PercentIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { OFFER_FEE_ABS_MIN, OFFER_FEE_REL_MIN, OFFER_MINSIZE_MIN } from '@/constants/jam'
import type { OfferType } from '@/constants/jm'
import { cn, factorToPercentage } from '@/lib/utils'
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

export interface EarnFormValues {
  offerType: OfferType
  offerAbsoluteFee?: number
  offerRelativeFee?: number
  offerMinAmount: number
}

const FORM_INPUT_DEFAULT_VALUES: Required<EarnFormValues> = {
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
  onSubmit: SubmitHandler<EarnFormValues>
  disabled?: boolean
}

export function EarnForm({ className, isWaitingMakerStart, onSubmit, disabled }: EarnFormProps) {
  const { t } = useTranslation()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    getValues,
    setValue,
  } = useForm<EarnFormValues, unknown, EarnFormValues>({
    mode: 'all',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<EarnFormValues, unknown, EarnFormValues>,
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
