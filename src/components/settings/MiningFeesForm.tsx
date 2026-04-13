import { useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TX_FEES_FACTOR_MIN,
  TX_FEES_FACTOR_MAX,
  MAX_SWEEP_FEE_CHANGE_MIN,
  MAX_SWEEP_FEE_CHANGE_MAX,
} from '@/constants/jam'
import { JM_MAX_SWEEP_FEE_CHANGE_DEFAULT, txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { isValidNumber, factorToPercentage, percentageToFactor } from '@/lib/utils'
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
        min: 1,
        max: 1_000,
      })
      const txFeesSatsMessage = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
        min: 1.001,
        max: 350,
      })
      const txFeesFactorMessage = t('settings.fees.feedback_invalid_tx_fees_factor', {
        min: factorToPercentage(TX_FEES_FACTOR_MIN),
        max: factorToPercentage(TX_FEES_FACTOR_MAX),
      })
      const maxSweepFeeChangeMessage = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
        min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN),
        max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX),
      })

      return yup
        .object({
          feeType: yup.string<TxFeeUnit>().oneOf([txFeeUnit.BLOCKS, txFeeUnit.SATS_PER_KILO_VBYTE]).required(),
          txFeesBlocks: yup.string().when('feeType', {
            is: txFeeUnit.BLOCKS,
            then: (schema) =>
              schema
                .test('tx-fees-blocks', txFeesBlocksMessage, (value) => {
                  const val = Number(value)
                  return !!value && isValidNumber(val) && val >= 1 && val <= 1_000
                })
                .required(txFeesBlocksMessage),
            otherwise: (schema) => schema.default(''),
          }),
          txFeesSatsPerVbyte: yup.string().when('feeType', {
            is: txFeeUnit.SATS_PER_KILO_VBYTE,
            then: (schema) =>
              schema
                .test('tx-fees-sats', txFeesSatsMessage, (value) => {
                  const val = Number(value)
                  return !!value && isValidNumber(val) && val >= 1.001 && val <= 350
                })
                .required(txFeesSatsMessage),
            otherwise: (schema) => schema.default(''),
          }),
          txFeesFactor: yup
            .string()
            .test('tx-fees-factor', txFeesFactorMessage, (value) => {
              const factorValue = percentageToFactor(Number(value))
              return (
                !!value &&
                isValidNumber(Number(value)) &&
                factorValue >= TX_FEES_FACTOR_MIN &&
                factorValue <= TX_FEES_FACTOR_MAX
              )
            })
            .required(txFeesFactorMessage),
          maxSweepFeeChange: yup
            .string()
            .test('max-sweep-fee-change', maxSweepFeeChangeMessage, (value) => {
              const sweepValue = percentageToFactor(Number(value))
              return (
                !!value &&
                isValidNumber(Number(value)) &&
                sweepValue >= MAX_SWEEP_FEE_CHANGE_MIN &&
                sweepValue <= MAX_SWEEP_FEE_CHANGE_MAX
              )
            })
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
      <div>
        <p className="text-muted-foreground mb-6 text-sm">{t('settings.fees.description_general_fee_settings')}</p>

        <div className="mb-6 space-y-2">
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

        <div className="mb-6 space-y-2">
          <Label>{t('settings.fees.label_tx_fees_factor')}</Label>
          <p className="text-muted-foreground text-xs">{t('settings.fees.description_tx_fees_factor_^0.9.10')}</p>
          <div className="flex h-12 items-center">
            <div className="bg-muted flex h-full items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">%</span>
            </div>
            <Input
              {...register('txFeesFactor')}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              placeholder="20"
              className="h-full rounded-l-none"
            />
          </div>
          {errors.txFeesFactor?.message && (
            <div className="text-destructive mt-1 text-xs">{errors.txFeesFactor.message}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('settings.fees.label_max_sweep_fee_change')}</Label>
          <p className="text-muted-foreground text-xs">
            {t('settings.fees.description_max_sweep_fee_change', {
              // TODO: i18n - change variable name.. `defaultValue` is used by the library!
              defaultValue: `${factorToPercentage(JM_MAX_SWEEP_FEE_CHANGE_DEFAULT)}%`,
            })}
          </p>
          <div className="flex h-12 items-center">
            <div className="bg-muted flex h-full items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">%</span>
            </div>
            <Input
              {...register('maxSweepFeeChange')}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              placeholder="80"
              className="h-full rounded-l-none"
            />
          </div>
          {errors.maxSweepFeeChange?.message && (
            <div className="text-destructive mt-1 text-xs">{errors.maxSweepFeeChange.message}</div>
          )}
        </div>
      </div>
    )
  },
)
