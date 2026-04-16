import { PercentIcon } from 'lucide-react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { JM_MAX_SWEEP_FEE_CHANGE_DEFAULT, txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { cn, factorToPercentage } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import type { MiningFeesFormValues } from './MiningFeesFormSchema'
import { TxFeeInputField } from './TxFeeInputField'

interface MiningFeesFormProps {
  className?: string
  form: UseFormReturn<MiningFeesFormValues, unknown, MiningFeesFormValues>
}

export const MiningFeesForm = ({
  className,
  form: {
    register,
    control,
    setValue,
    formState: { errors, disabled },
  },
}: MiningFeesFormProps) => {
  const { t } = useTranslation()

  const feeType = useWatch({ control, name: 'feeType' })
  const txFeesBlocks = useWatch({ control, name: 'txFeesBlocks' })
  const txFeesSatsPerVbyte = useWatch({ control, name: 'txFeesSatsPerVbyte' })

  const handleTxFeeUnitChange = (newUnit: TxFeeUnit) => {
    if (newUnit !== feeType) {
      const currentValue = feeType === txFeeUnit.BLOCKS ? txFeesBlocks : txFeesSatsPerVbyte

      if (currentValue) {
        const numberValue = Number(currentValue)
        if (!Number.isNaN(numberValue)) {
          if (newUnit === txFeeUnit.SATS_PER_KILO_VBYTE && feeType === txFeeUnit.BLOCKS) {
            setValue('txFeesSatsPerVbyte', Math.round(numberValue * 1_000) / 1_000, {
              shouldDirty: true,
              shouldValidate: true,
            })
          } else if (newUnit === txFeeUnit.BLOCKS && feeType === txFeeUnit.SATS_PER_KILO_VBYTE) {
            const converted = Math.round(numberValue * 1_000)
            setValue('txFeesBlocks', Math.round(converted / 1_000), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        }
      }
    }

    setValue('feeType', newUnit, { shouldDirty: true, shouldValidate: true })
  }

  const handleTxFeeValueChange = (value: string) => {
    const fieldName = feeType === txFeeUnit.BLOCKS ? 'txFeesBlocks' : 'txFeesSatsPerVbyte'
    setValue(fieldName, Number(value), { shouldDirty: true, shouldValidate: true })
  }

  const txFeesError = feeType === txFeeUnit.BLOCKS ? errors.txFeesBlocks?.message : errors.txFeesSatsPerVbyte?.message

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-muted-foreground text-sm">{t('settings.fees.description_general_fee_settings')}</p>

      <div className="space-y-2">
        <Label>{t('settings.fees.label_tx_fees')}</Label>
        <TxFeeInputField
          value={String(feeType === txFeeUnit.BLOCKS ? txFeesBlocks : txFeesSatsPerVbyte)}
          unit={feeType}
          onUnitChange={handleTxFeeUnitChange}
          onValueChange={handleTxFeeValueChange}
          error={txFeesError}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Field data-invalid={errors.txFeesFactorInPercent !== undefined}>
          <FieldLabel htmlFor="mining-fees-tx-fees-factor">{t('settings.fees.label_tx_fees_factor')}</FieldLabel>
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
        </Field>
        {errors.txFeesFactorInPercent?.message && (
          <div className="text-destructive text-xs">{errors.txFeesFactorInPercent.message}</div>
        )}
      </div>

      <div className="space-y-2">
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
            <div className="text-destructive text-xs">{errors.maxSweepFeeChangeInPercent.message}</div>
          )}
        </Field>
      </div>
    </div>
  )
}
