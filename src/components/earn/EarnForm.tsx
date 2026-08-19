import { useId, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { AlertTriangleIcon, GiftIcon, HandshakeIcon, PercentIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Balance } from '@/components/ui/jam/Balance'
import { SatSymbol } from '@/components/ui/jam/CurrencySymbol'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import * as JAM from '@/constants/jam'
import { OFFERTYPE_ABS, OFFERTYPE_REL, type OfferType } from '@/constants/jm'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { cn, factorToPercentage, isValidInteger, isValidNumber } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

const OFFERTYPE_FREE = '__free'

export interface EarnFormValues {
  offerType: OfferType | '__free'
  offerAbsoluteFee?: AmountSats
  offerRelativeFeeInPercent?: number
  offerMinAmount: AmountSats
}

const FORM_INPUT_DEFAULT_VALUES: Required<EarnFormValues> = {
  offerType: OFFERTYPE_FREE,
  offerRelativeFeeInPercent: factorToPercentage(JAM.OFFER_FEE_REL_DEFAULT),
  offerAbsoluteFee: JAM.OFFER_FEE_ABS_DEFAULT,
  offerMinAmount: JAM.OFFER_MINSIZE_DEFAULT,
}

const earnFormBaseSchema = (fidelityBonds: Utxo[], t: TFunction) => {
  const invalidRelativeFeeMessage = t('earn.feedback_invalid_rel_fee', {
    feeRelPercentageMin: `${factorToPercentage(JAM.OFFER_FEE_REL_MIN)}%`,
    feeRelPercentageMax: `${factorToPercentage(JAM.OFFER_FEE_REL_MAX)}%`,
  })

  return yup
    .object({
      offerType: yup
        .string<OfferType | '__free'>()
        .default(FORM_INPUT_DEFAULT_VALUES.offerType)
        .required()
        .test('valid-offer-type-test', t('earn.feedback_invalid_offer_type_bondless_maker'), (value) => {
          if (fidelityBonds.length === 0) {
            return value === OFFERTYPE_FREE
          }
          return true
        }),
      offerAbsoluteFee: yup
        .number()
        .integer(t('earn.feedback_invalid_abs_fee'))
        .transform((value) => (isValidInteger(value) ? value : null))
        .when('offerType', {
          is: (val: OfferType) => val === OFFERTYPE_ABS,
          then: (schema) =>
            schema
              .min(JAM.OFFER_FEE_ABS_MIN, t('earn.feedback_invalid_abs_fee'))
              .required(t('earn.feedback_invalid_abs_fee'))
              .test('valid-absolute-fee-test', t('earn.feedback_invalid_abs_fee_bondless_maker'), (value) => {
                if (fidelityBonds.length === 0) {
                  return value === 0
                }
                return true
              }),
          otherwise: (schema) => schema.nullable().optional(),
        }),
      offerRelativeFeeInPercent: yup
        .number()
        .transform((value) => (isValidNumber(value) ? value : null))
        .when('offerType', {
          is: (val: OfferType) => val === OFFERTYPE_REL,
          then: (schema) =>
            schema
              .min(factorToPercentage(JAM.OFFER_FEE_REL_MIN), invalidRelativeFeeMessage)
              .max(factorToPercentage(JAM.OFFER_FEE_REL_MAX), invalidRelativeFeeMessage)
              .required(invalidRelativeFeeMessage)
              .test('valid-relate-fee-test', t('earn.feedback_invalid_rel_fee_bondless_maker'), () => {
                return fidelityBonds.length > 0
              }),
          otherwise: (schema) => schema.nullable().optional(),
        }),
    })
    .required()
}

const OfferTypeInput = ({
  className,
  ...props
}: Omit<React.ComponentProps<typeof RadioGroup>, 'onValueChange'> & {
  onValueChange: (value: OfferType | '__free') => void
}) => {
  const { t } = useTranslation()
  const id = useId()

  return (
    <RadioGroup
      className={cn('flex flex-wrap items-center items-stretch justify-center gap-1.5', className)}
      {...props}
    >
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 has-data-[state=checked]:bg-primary/5 relative flex min-w-42 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-2">
        <RadioGroupItem
          value={OFFERTYPE_FREE}
          id={`${id}-${OFFERTYPE_FREE}`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-1.5">
          <GiftIcon />
          <Label htmlFor={`${id}-${OFFERTYPE_FREE}`} className="justify-center">
            {t('earn.radio_free_offer_label')}
          </Label>
        </div>
      </div>
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 has-data-[state=checked]:bg-primary/5 relative flex min-w-42 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-2">
        <RadioGroupItem
          value={OFFERTYPE_ABS}
          id={`${id}-${OFFERTYPE_ABS}`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-1.5">
          <HandshakeIcon />
          <Label htmlFor={`${id}-${OFFERTYPE_ABS}`} className="justify-center">
            {t('earn.radio_abs_offer_label')}
          </Label>
        </div>
      </div>
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 has-data-[state=checked]:bg-primary/5 relative flex min-w-42 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-2">
        <RadioGroupItem
          value={OFFERTYPE_REL}
          id={`${id}-${OFFERTYPE_REL}`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-1.5">
          <PercentIcon />
          <Label htmlFor={`${id}-${OFFERTYPE_REL}`} className="justify-center">
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
  fidelityBonds: Utxo[]
  onSubmit: SubmitHandler<EarnFormValues>
  offerMinsizeMax: AmountSats
  disabled?: boolean
  debug?: boolean
}

export function EarnForm({
  className,
  isWaitingMakerStart,
  fidelityBonds,
  onSubmit,
  offerMinsizeMax,
  disabled,
  debug = false,
}: EarnFormProps) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      // eslint-disable-next-line unicorn/prefer-spread -- false positive
      earnFormBaseSchema(fidelityBonds, t).concat(
        yup.object({
          offerMinAmount: yup
            .number()
            .transform((value) => (isValidInteger(value) ? value : null))
            .integer(t('earn.feedback_invalid_min_amount'))
            .min(
              JAM.OFFER_MINSIZE_MIN,
              t('earn.feedback_invalid_min_amount_range', {
                minAmountMin: JAM.OFFER_MINSIZE_MIN.toLocaleString(),
                minAmountMax: offerMinsizeMax.toLocaleString(),
              }),
            )
            .max(
              offerMinsizeMax,
              t('earn.feedback_invalid_min_amount_range', {
                minAmountMin: JAM.OFFER_MINSIZE_MIN.toLocaleString(),
                minAmountMax: offerMinsizeMax.toLocaleString(),
              }),
            )
            .required(t('earn.feedback_invalid_min_amount')),
        }),
      ),
    [t, fidelityBonds, offerMinsizeMax],
  )

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<EarnFormValues, unknown, EarnFormValues>({
    mode: 'onSubmit',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    resolver: yupResolver(schema),
  })

  const watchOfferType = useWatch({ control, name: 'offerType' })
  const watchOfferAbsoluteFee = useWatch({ control, name: 'offerAbsoluteFee' })
  const watchOfferRelativeFeeInPercent = useWatch({ control, name: 'offerRelativeFeeInPercent' })

  const collapsibleFormElementsValid = [errors.offerMinAmount].every((it) => it === undefined)

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      <Field data-invalid={errors.offerType !== undefined}>
        <OfferTypeInput
          defaultValue={FORM_INPUT_DEFAULT_VALUES.offerType}
          onValueChange={(value) => {
            setValue('offerType', value, {
              shouldValidate: true, // trigger validation
              shouldTouch: true, // update touched fields form state
              shouldDirty: true, // update dirty and dirty fields form state
            })
          }}
          disabled={disabled}
        />
        {errors.offerType?.message && (
          <FieldError className="flex justify-center">{errors.offerType.message}</FieldError>
        )}
      </Field>
      <Tabs value={watchOfferType} className={!debug && errors.offerType?.message ? 'hidden' : undefined}>
        <TabsContent value={OFFERTYPE_ABS}>
          <Field data-invalid={errors.offerAbsoluteFee !== undefined}>
            <FieldLabel htmlFor="offerAbsoluteFee">
              {t('earn.label_abs_fee', {
                fee:
                  watchOfferAbsoluteFee !== undefined
                    ? `(${watchOfferAbsoluteFee === 0 ? t('earn.text_abs_fee_zero') : `${watchOfferAbsoluteFee.toLocaleString()} sats`})`
                    : '',
              })}
            </FieldLabel>
            <FieldDescription className="text-xs">{t('earn.description_abs_fee')}</FieldDescription>

            <div className="align-center flex flex-wrap justify-center gap-1.5">
              {JAM.OFFER_FEE_BANDS.absolute.map((it, index) => {
                return (
                  <Button
                    key={index}
                    type="button"
                    variant={it === watchOfferAbsoluteFee ? 'default' : 'outline'}
                    className="min-w-25 sm:min-w-50"
                    disabled={disabled}
                    onClick={() =>
                      setValue('offerAbsoluteFee', it, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    {it === 0 ? (
                      t('earn.text_abs_fee_zero')
                    ) : (
                      <Balance
                        className="select-none"
                        valueString={String(it)}
                        showBalance={true}
                        enableVisibilityToggle={false}
                      />
                    )}
                  </Button>
                )
              })}
            </div>
            <InputGroup className="hidden">
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
            {errors.offerAbsoluteFee?.message && <FieldError>{errors.offerAbsoluteFee.message}</FieldError>}
          </Field>
        </TabsContent>
        <TabsContent value={OFFERTYPE_REL}>
          <Field data-invalid={errors.offerRelativeFeeInPercent !== undefined}>
            <FieldLabel htmlFor="offerRelativeFeeInPercent">
              {t('earn.label_rel_fee', {
                fee: watchOfferRelativeFeeInPercent !== undefined ? `(${watchOfferRelativeFeeInPercent}%)` : '',
              })}
            </FieldLabel>
            <FieldDescription className="text-xs">{t('earn.description_rel_fee')}</FieldDescription>

            <div className="align-center flex flex-wrap justify-center gap-1.5">
              {JAM.OFFER_FEE_BANDS.relative
                .map((it) => factorToPercentage(it))
                .map((it, index) => {
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={it === watchOfferRelativeFeeInPercent ? 'default' : 'outline'}
                      className="min-w-25 sm:min-w-33"
                      disabled={disabled}
                      onClick={() =>
                        setValue('offerRelativeFeeInPercent', it, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      {it.toLocaleString()}%
                    </Button>
                  )
                })}
            </div>
            <InputGroup className="hidden">
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
            {errors.offerRelativeFeeInPercent && <FieldError>{errors.offerRelativeFeeInPercent.message}</FieldError>}
          </Field>
        </TabsContent>
      </Tabs>

      <Accordion type="single" collapsible>
        <AccordionItem value="options">
          <AccordionTrigger
            className={cn({
              'text-destructive': !collapsibleFormElementsValid,
            })}
          >
            <div className="flex items-center gap-2">
              {!collapsibleFormElementsValid ? <AlertTriangleIcon /> : null}
              {t('earn.earn_options')}
            </div>
          </AccordionTrigger>

          <AccordionContent
            className={cn('flex flex-col gap-6 py-2', 'mx-1' /* add x-spacing for input component focus state*/)}
          >
            <Field data-invalid={errors.offerMinAmount !== undefined}>
              <FieldLabel htmlFor="offerMinAmount">{t('earn.label_min_amount_input')}</FieldLabel>
              <FieldDescription className="text-xs">{t('earn.description_min_amount_input')}</FieldDescription>
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

              {errors.offerMinAmount && (
                <FieldError>
                  {offerMinsizeMax < JAM.OFFER_MINSIZE_MIN ? (
                    <>{t('earn.feedback_invalid_min_amount_insufficient_funds')}</>
                  ) : (
                    <>{errors.offerMinAmount?.message || t('earn.feedback_invalid_min_amount')}</>
                  )}
                </FieldError>
              )}
            </Field>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
    </form>
  )
}
