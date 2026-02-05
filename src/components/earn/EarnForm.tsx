import { useId } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { HandshakeIcon, PercentIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { SatSymbol } from '@/components/ui/jam/CurrencySymbol'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import * as JAM from '@/constants/jam'
import type { OfferType } from '@/constants/jm'
import { cn, factorToPercentage } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { Spinner } from '../ui/spinner'

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
  offerAbsoluteFee?: AmountSats
  offerRelativeFeeInPercent?: number
  offerMinAmount: AmountSats
}

const FORM_INPUT_DEFAULT_VALUES: Required<EarnFormValues> = {
  offerType: OFFERTYPE_ABS,
  offerRelativeFeeInPercent: factorToPercentage(JAM.OFFER_FEE_REL_DEFAULT),
  offerAbsoluteFee: JAM.OFFER_FEE_ABS_DEFAULT,
  offerMinAmount: JAM.OFFER_MINSIZE_DEFAULT,
}

const baseSchema = yup
  .object({
    offerType: yup.string<OfferType>().default(FORM_INPUT_DEFAULT_VALUES.offerType).required(),
    offerAbsoluteFee: yup
      .number()
      .integer()
      .when('offerType', {
        is: (val: OfferType) => val === OFFERTYPE_ABS,
        then: (schema) => schema.min(JAM.OFFER_FEE_ABS_MIN).required(),
        otherwise: (schema) =>
          schema
            .transform((value) => (Number.isNaN(value) ? null : value))
            .nullable()
            .optional(),
      }),
    offerRelativeFeeInPercent: yup.number().when('offerType', {
      is: (val: OfferType) => val === OFFERTYPE_REL,
      then: (schema) =>
        schema.min(factorToPercentage(JAM.OFFER_FEE_REL_MIN)).max(factorToPercentage(JAM.OFFER_FEE_REL_MAX)).required(),
      otherwise: (schema) =>
        schema
          .transform((value) => (Number.isNaN(value) ? null : value))
          .nullable()
          .optional(),
    }),
  })
  .required()

const OfferTypeInput = (props: React.ComponentProps<typeof RadioGroup>) => {
  const { t } = useTranslation()
  const id = useId()

  return (
    <RadioGroup className="flex items-center justify-center" {...props}>
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 relative flex w-full max-w-50 cursor-pointer flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-[2px]">
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
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 relative flex w-full max-w-50 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-[2px]">
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

/* TODO: make offerMinsizeMax mandatory and remove this placehodler */
const OFFER_MINSIZE_MAX_PLACEHODLER = JAM.OFFER_MINSIZE_MIN * 1_000

interface EarnFormProps {
  className?: string
  isWaitingMakerStart: boolean
  onSubmit: SubmitHandler<EarnFormValues>
  /* TODO: make offerMinsizeMax mandatory */
  offerMinsizeMax?: AmountSats
  disabled?: boolean
  debug?: boolean
}

export function EarnForm({
  className,
  isWaitingMakerStart,
  onSubmit,
  disabled,
  offerMinsizeMax = OFFER_MINSIZE_MAX_PLACEHODLER,
  debug = false,
}: EarnFormProps) {
  const { t } = useTranslation()

  // eslint-disable-next-line unicorn/prefer-spread -- false positive
  const schema = baseSchema.concat(
    yup.object({
      offerMinAmount: yup.number().integer().min(JAM.OFFER_MINSIZE_MIN).max(offerMinsizeMax).required(),
    }),
  )

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    getValues,
    setValue,
  } = useForm<EarnFormValues, unknown, EarnFormValues>({
    mode: 'onSubmit',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<EarnFormValues, unknown, EarnFormValues>,
  })

  const values = useWatch({ control })
  const watchOfferType = useWatch({ control, name: 'offerType' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)} noValidate>
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
            <Field data-invalid={errors.offerAbsoluteFee !== undefined}>
              <FieldLabel htmlFor="offerAbsoluteFee">
                {t('earn.label_abs_fee', {
                  fee: '', // empty on purpose
                })}
              </FieldLabel>
              <FieldDescription className="text-xs">{t('earn.description_abs_fee')}</FieldDescription>
              <InputGroup>
                <InputGroupInput
                  id="offerAbsoluteFee"
                  {...register('offerAbsoluteFee', {
                    disabled,
                  })}
                  type="number"
                  step={1}
                />
                <InputGroupAddon align="inline-start">{FieldPrefixSatSymbol}</InputGroupAddon>
              </InputGroup>
            </Field>
            {errors.offerAbsoluteFee && (
              <div className="text-destructive text-xs">{t('earn.feedback_invalid_abs_fee')}</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value={OFFERTYPE_REL}>
          <div className="space-y-2">
            <Field data-invalid={errors.offerRelativeFeeInPercent !== undefined}>
              <FieldLabel htmlFor="offerRelativeFeeInPercent">
                {t('earn.label_rel_fee', {
                  fee: getValues('offerRelativeFeeInPercent') ? `(${getValues('offerRelativeFeeInPercent')!}%)` : '',
                })}
              </FieldLabel>
              <FieldDescription className="text-xs">{t('earn.description_rel_fee')}</FieldDescription>
              <InputGroup>
                <InputGroupInput
                  id="offerRelativeFeeInPercent"
                  {...register('offerRelativeFeeInPercent', {
                    disabled,
                  })}
                  type="number"
                  step={factorToPercentage(JAM.OFFER_FEE_REL_STEP)}
                />
                <InputGroupAddon align="inline-start">%</InputGroupAddon>
              </InputGroup>
            </Field>
            {errors.offerRelativeFeeInPercent && (
              <div className="text-destructive text-xs">
                {t('earn.feedback_invalid_rel_fee', {
                  feeRelPercentageMin: `${factorToPercentage(JAM.OFFER_FEE_REL_MIN)}%`,
                  feeRelPercentageMax: `${factorToPercentage(JAM.OFFER_FEE_REL_MAX)}%`,
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Field data-invalid={errors.offerMinAmount !== undefined}>
          <FieldLabel htmlFor="offerMinAmount">{t('earn.label_min_amount_input')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="offerMinAmount"
              {...register('offerMinAmount', {
                required: true,
                disabled,
              })}
              type="number"
              max={offerMinsizeMax}
              step={1}
              placeholder={t('earn.placeholder_min_amount_input')}
            />
            <InputGroupAddon align="inline-start">{FieldPrefixSatSymbol}</InputGroupAddon>
          </InputGroup>
        </Field>

        {errors.offerMinAmount && (
          <div className="text-destructive text-xs">
            {errors.offerMinAmount.type === 'min' || errors.offerMinAmount.type === 'max' ? (
              <>
                {t('earn.feedback_invalid_min_amount_range', {
                  minAmountMin: JAM.OFFER_MINSIZE_MIN.toLocaleString(),
                  minAmountMax: offerMinsizeMax.toLocaleString(),
                })}
              </>
            ) : (
              <>{t('earn.feedback_invalid_min_amount')}</>
            )}
          </div>
        )}
      </div>
      <Button
        type="submit"
        variant={disabled && !isWaitingMakerStart ? 'outline' : undefined}
        disabled={disabled || isSubmitting || isWaitingMakerStart}
        className="w-full"
        size="xxl"
      >
        {isSubmitting || isWaitingMakerStart ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('earn.text_starting')}
          </>
        ) : (
          <>{t('earn.button_start')}</>
        )}
      </Button>

      {debug && (
        <Card className="mt-8">
          <CardHeader className="grid">
            <DevBadge className="justify-self-end" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">isValid:</code>
              <pre className="text-xs">{JSON.stringify(isValid, null, 2)}</pre>
            </div>
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">values:</code>
              <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
