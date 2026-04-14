import { useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { PercentIcon } from 'lucide-react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Label } from '@/components/ui/label'
import {
  TX_FEES_FACTOR_MIN,
  TX_FEES_FACTOR_MAX,
  MAX_SWEEP_FEE_CHANGE_MIN,
  MAX_SWEEP_FEE_CHANGE_MAX,
} from '@/constants/jam'
import { JM_MAX_SWEEP_FEE_CHANGE_DEFAULT, txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { factorToPercentage, percentageToFactor } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { TxFeeInputField } from './TxFeeInputField'

interface MiningFeesFormProps {
  initialValues: {
    txFees: string
    txFeesFactor: string
    maxSweepFeeChange: string
  }
  enableValidation?: boolean
}

type MiningFeesFormValues = {
  feeType: TxFeeUnit
  txFeesBlocks: string
  txFeesSatsPerVbyte: string
  txFeesFactor: string
  maxSweepFeeChange: string
}

export interface MiningFeesFormRef {
  getFormData: () => {
    txFees: string
    txFeesFactor: string
    maxSweepFeeChange: string
  } | null
  setFormData: (data: { txFees: string; txFeesFactor: string; maxSweepFeeChange: string }) => void
  resetForm: () => void
  validateForm: () => Promise<boolean>
}

const getMiningFeesFormValues = (initialValues: MiningFeesFormProps['initialValues']): MiningFeesFormValues => {
  const txFeesValue = Number(initialValues.txFees)

  if (initialValues.txFees && txFeesValue >= 1_001) {
    return {
      feeType: txFeeUnit.SATS_PER_KILO_VBYTE,
      txFeesBlocks: '',
      txFeesSatsPerVbyte: String(txFeesValue / 1_000),
      txFeesFactor: initialValues.txFeesFactor,
      maxSweepFeeChange: initialValues.maxSweepFeeChange,
    }
  }

  return {
    feeType: txFeeUnit.BLOCKS,
    txFeesBlocks: initialValues.txFees,
    txFeesSatsPerVbyte: '',
    txFeesFactor: initialValues.txFeesFactor,
    maxSweepFeeChange: initialValues.maxSweepFeeChange,
  }
}

const DEFAULT_MINING_FEES_FORM_VALUES: MiningFeesFormValues = {
  feeType: txFeeUnit.BLOCKS,
  txFeesBlocks: '3',
  txFeesSatsPerVbyte: '',
  txFeesFactor: '20',
  maxSweepFeeChange: '80',
}

export const MiningFeesForm = forwardRef<MiningFeesFormRef, MiningFeesFormProps>(
  ({ initialValues, enableValidation = true }, ref) => {
    const { t } = useTranslation()
    const schema = useMemo(() => {
      if (!enableValidation) {
        return yup
          .object({
            feeType: yup.string<TxFeeUnit>().oneOf([txFeeUnit.BLOCKS, txFeeUnit.SATS_PER_KILO_VBYTE]).required(),
            txFeesBlocks: yup.string().default(''),
            txFeesSatsPerVbyte: yup.string().default(''),
            txFeesFactor: yup.string().default(''),
            maxSweepFeeChange: yup.string().default(''),
          })
          .required()
      }

      const txFeesBlocksMessage = t('settings.fees.feedback_invalid_tx_fees_blocks', {
        min: Number(1).toLocaleString(),
        max: Number(1_000).toLocaleString(),
      })
      const txFeesSatsMessage = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
        min: Number(1.001).toLocaleString(),
        max: Number(350).toLocaleString(),
      })
      const txFeesFactorMessage = t('settings.fees.feedback_invalid_tx_fees_factor', {
        min: factorToPercentage(TX_FEES_FACTOR_MIN).toLocaleString(),
        max: factorToPercentage(TX_FEES_FACTOR_MAX).toLocaleString(),
      })
      const maxSweepFeeChangeMessage = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
        min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN).toLocaleString(),
        max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX).toLocaleString(),
      })

      return yup
        .object({
          feeType: yup.string<TxFeeUnit>().oneOf([txFeeUnit.BLOCKS, txFeeUnit.SATS_PER_KILO_VBYTE]).required(),
          txFeesBlocks: yup.number().when('feeType', {
            is: txFeeUnit.BLOCKS,
            then: (schema) =>
              schema
                .integer(txFeesBlocksMessage)
                .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
                .min(1, txFeesBlocksMessage)
                .max(1_000, txFeesBlocksMessage)
                .required(txFeesBlocksMessage),
            otherwise: (schema) => schema.nullable().optional(),
          }),
          txFeesSatsPerVbyte: yup.number().when('feeType', {
            is: txFeeUnit.SATS_PER_KILO_VBYTE,
            then: (schema) =>
              schema
                .transform((value) => (Number.isFinite(value) ? Number(value) : null))
                .min(1.001, txFeesSatsMessage)
                .max(350, txFeesSatsMessage)
                .required(txFeesSatsMessage),
            otherwise: (schema) => schema.nullable().optional(),
          }),
          txFeesFactor: yup
            .number()
            .transform((value) => (Number.isFinite(value) ? Number(value) : null))
            .min(factorToPercentage(TX_FEES_FACTOR_MIN), txFeesFactorMessage)
            .max(factorToPercentage(TX_FEES_FACTOR_MAX), txFeesFactorMessage)
            .required(txFeesFactorMessage),
          maxSweepFeeChange: yup
            .number()
            .transform((value) => (Number.isFinite(value) ? Number(value) : null))
            .min(factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN), maxSweepFeeChangeMessage)
            .max(factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX), maxSweepFeeChangeMessage)
            .required(maxSweepFeeChangeMessage),
        })
        .required()
    }, [enableValidation, t])

    const {
      control,
      register,
      getValues,
      reset,
      setValue,
      trigger,
      formState: { errors },
    } = useForm<MiningFeesFormValues, unknown, MiningFeesFormValues>({
      mode: 'onChange',
      defaultValues: getMiningFeesFormValues(initialValues),
      resolver: yupResolver(schema as yup.AnyObjectSchema) as Resolver<
        MiningFeesFormValues,
        unknown,
        MiningFeesFormValues
      >,
    })

    const feeType = useWatch({ control, name: 'feeType' })
    const txFeesBlocks = useWatch({ control, name: 'txFeesBlocks' })
    const txFeesSatsPerVbyte = useWatch({ control, name: 'txFeesSatsPerVbyte' })

    useEffect(() => {
      void trigger()
    }, [trigger, enableValidation])

    const handleTxFeeUnitChange = (newUnit: TxFeeUnit) => {
      if (newUnit !== feeType) {
        const currentValue = feeType === txFeeUnit.BLOCKS ? txFeesBlocks : txFeesSatsPerVbyte

        if (currentValue) {
          const numberValue = Number(currentValue)
          if (!Number.isNaN(numberValue)) {
            if (newUnit === txFeeUnit.SATS_PER_KILO_VBYTE && feeType === txFeeUnit.BLOCKS) {
              setValue('txFeesSatsPerVbyte', String(Math.round(numberValue * 1_000) / 1_000), {
                shouldDirty: true,
                shouldValidate: true,
              })
            } else if (newUnit === txFeeUnit.BLOCKS && feeType === txFeeUnit.SATS_PER_KILO_VBYTE) {
              const converted = Math.round(numberValue * 1_000)
              setValue('txFeesBlocks', String(Math.round(converted / 1_000)), {
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
      setValue(fieldName, value, { shouldDirty: true, shouldValidate: true })
    }

    useImperativeHandle(
      ref,
      () => ({
        getFormData: () => {
          const values = getValues()
          if (!schema.isValidSync(values)) {
            return null
          }
          return {
            txFees:
              values.feeType === txFeeUnit.BLOCKS
                ? values.txFeesBlocks
                : String(Math.round(Number(values.txFeesSatsPerVbyte) * 1_000)),
            txFeesFactor: values.txFeesFactor ? String(percentageToFactor(Number(values.txFeesFactor))) : '',
            maxSweepFeeChange: values.maxSweepFeeChange
              ? String(percentageToFactor(Number(values.maxSweepFeeChange)))
              : '',
          }
        },
        setFormData: (data: { txFees: string; txFeesFactor: string; maxSweepFeeChange: string }) => {
          reset(
            getMiningFeesFormValues({
              txFees: data.txFees,
              txFeesFactor: data.txFeesFactor ? String(factorToPercentage(Number(data.txFeesFactor))) : '',
              maxSweepFeeChange: data.maxSweepFeeChange
                ? String(factorToPercentage(Number(data.maxSweepFeeChange)))
                : '',
            }),
          )
          void trigger()
        },
        resetForm: () => {
          reset(DEFAULT_MINING_FEES_FORM_VALUES)
          void trigger()
        },
        validateForm: () => trigger(),
      }),
      [getValues, reset, schema, trigger],
    )

    const txFeesError = feeType === txFeeUnit.BLOCKS ? errors.txFeesBlocks?.message : errors.txFeesSatsPerVbyte?.message

    return (
      <div className="space-y-6">
        <p className="text-muted-foreground mb-6 text-sm">{t('settings.fees.description_general_fee_settings')}</p>

        <div className="space-y-2">
          <Label>{t('settings.fees.label_tx_fees')}</Label>
          <TxFeeInputField
            value={feeType === txFeeUnit.BLOCKS ? txFeesBlocks : txFeesSatsPerVbyte}
            unit={feeType}
            onUnitChange={handleTxFeeUnitChange}
            onValueChange={handleTxFeeValueChange}
            error={txFeesError}
            disabled={false}
          />
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.txFeesFactor !== undefined}>
            <FieldLabel htmlFor="mining-fees-tx-fees-factor">{t('settings.fees.label_tx_fees_factor')}</FieldLabel>
            <FieldDescription className="text-xs">
              {t('settings.fees.description_tx_fees_factor_^0.9.10')}
            </FieldDescription>
            <InputGroup>
              <InputGroupInput
                id="mining-fees-tx-fees-factor"
                {...register('txFeesFactor')}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="20"
              />
              <InputGroupAddon align="inline-start">
                <PercentIcon />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {errors.txFeesFactor?.message && (
            <div className="text-destructive text-xs">{errors.txFeesFactor.message}</div>
          )}
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.maxSweepFeeChange !== undefined}>
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
                {...register('maxSweepFeeChange')}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                placeholder="80"
              />
              <InputGroupAddon align="inline-start">
                <PercentIcon />
              </InputGroupAddon>
            </InputGroup>
            {errors.maxSweepFeeChange?.message && (
              <div className="text-destructive text-xs">{errors.maxSweepFeeChange.message}</div>
            )}
          </Field>
        </div>
      </div>
    )
  },
)
