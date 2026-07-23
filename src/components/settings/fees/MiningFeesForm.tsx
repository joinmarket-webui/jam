import { useMemo } from 'react'
import { PercentIcon } from 'lucide-react'
import { FormProvider, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { JM_MAX_SWEEP_FEE_CHANGE_DEFAULT, JM_TX_FEES_FACTOR_DEFAULT } from '@/constants/jm'
import { cn, factorToPercentage } from '@/lib/utils'
import { TxFeeForm } from '../../send/TxFeeForm'
import { Field, FieldDescription, FieldError, FieldLabel } from '../../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../ui/input-group'
import type { MiningFeesFormValues } from './MiningFeesForm.schema'

interface MiningFeesFormProps {
  className?: string
  form: UseFormReturn<MiningFeesFormValues, unknown, MiningFeesFormValues>
}

export const MiningFeesForm = ({
  className,
  form: { register, control, setValue, formState, ...formMethods },
}: MiningFeesFormProps) => {
  const { t } = useTranslation()
  const { errors, disabled } = useMemo(
    () => ({
      errors: formState.errors,
      disabled: formState.disabled,
    }),
    [formState.errors, formState.disabled],
  )

  return (
    <FormProvider control={control} register={register} formState={formState} setValue={setValue} {...formMethods}>
      <div className={cn('flex flex-col gap-4', className)}>
        <p className="text-muted-foreground text-sm">{t('settings.fees.description_general_fee_settings')}</p>

        <TxFeeForm />

        <Field data-invalid={errors.txFeesFactorInPercent !== undefined}>
          <FieldLabel htmlFor="mining-fees-tx-fees-factor">
            {t('settings.fees.label_tx_fees_factor', {
              // TODO: i18n - change variable name.. `defaultValue` is used by the library!
              defaultValue: `${factorToPercentage(JM_TX_FEES_FACTOR_DEFAULT)}%`,
            })}
          </FieldLabel>
          <FieldDescription className="text-xs">
            {t('settings.fees.description_tx_fees_factor_^0.9.10')}
          </FieldDescription>
          <InputGroup>
            <InputGroupInput
              id="mining-fees-tx-fees-factor"
              {...register('txFeesFactorInPercent', {
                disabled,
                valueAsNumber: true,
              })}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
            />
            <InputGroupAddon align="inline-start">
              <PercentIcon />
            </InputGroupAddon>
          </InputGroup>
          {errors.txFeesFactorInPercent?.message && <FieldError>{errors.txFeesFactorInPercent.message}</FieldError>}
        </Field>

        <Field data-invalid={errors.maxSweepFeeChangeInPercent !== undefined}>
          <FieldLabel htmlFor="mining-fees-sweep-fee-change">
            {t('settings.fees.label_max_sweep_fee_change')}
          </FieldLabel>
          <FieldDescription className="text-xs">
            {t('settings.fees.description_max_sweep_fee_change', {
              // TODO: i18n - change variable name.. `defaultValue` is used by the library!
              defaultValue: `${factorToPercentage(JM_MAX_SWEEP_FEE_CHANGE_DEFAULT)}%`,
            })}
          </FieldDescription>
          <InputGroup>
            <InputGroupInput
              id="mining-fees-sweep-fee-change"
              {...register('maxSweepFeeChangeInPercent', {
                disabled,
                valueAsNumber: true,
              })}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
            />
            <InputGroupAddon align="inline-start">
              <PercentIcon />
            </InputGroupAddon>
          </InputGroup>
          {errors.maxSweepFeeChangeInPercent?.message && (
            <FieldError>{errors.maxSweepFeeChangeInPercent.message}</FieldError>
          )}
        </Field>
      </div>
    </FormProvider>
  )
}
