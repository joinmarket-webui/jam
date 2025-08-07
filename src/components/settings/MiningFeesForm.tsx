import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
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

export interface MiningFeesFormRef {
  getFormData: () => {
    txFees: string
    txFeesFactor: string
    maxSweepFeeChange: string
  } | null
  setFormData: (data: { txFees: string; txFeesFactor: string; maxSweepFeeChange: string }) => void
  resetForm: () => void
  validateForm: () => boolean
}

export const MiningFeesForm = forwardRef<MiningFeesFormRef, MiningFeesFormProps>(
  ({ initialValues, enableValidation = true }, ref) => {
    const { t } = useTranslation()
    const [feeType, setFeeType] = useState<TxFeeUnit>(txFeeUnit.BLOCKS)
    const [txFeesBlocks, setTxFeesBlocks] = useState('')
    const [txFeesSatsPerVbyte, setTxFeesSatsPerVbyte] = useState('')
    const [txFeesFactor, setTxFeesFactor] = useState(initialValues.txFeesFactor)
    const [maxSweepFeeChange, setMaxSweepFeeChange] = useState(initialValues.maxSweepFeeChange)

    const [errors, setErrors] = useState<{ txFees?: string; txFeesFactor?: string; maxSweepFeeChange?: string }>({})

    // Initialize txFees with proper unit detection
    useEffect(() => {
      if (initialValues.txFees) {
        const txFeesValue = Number(initialValues.txFees)
        if (txFeesValue >= 1001) {
          // This is sats/kilo-vbyte, display as sats/vbyte
          setFeeType(txFeeUnit.SATS_PER_KILO_VBYTE)
          setTxFeesSatsPerVbyte(String(txFeesValue / 1000))
          setTxFeesBlocks('')
        } else {
          // This is blocks
          setFeeType(txFeeUnit.BLOCKS)
          setTxFeesBlocks(initialValues.txFees)
          setTxFeesSatsPerVbyte('')
        }
      }
    }, [initialValues.txFees])

    const validate = () => {
      if (!enableValidation) {
        setErrors({})
        return true
      }
      const newErrors: { txFees?: string; txFeesFactor?: string; maxSweepFeeChange?: string } = {}

      if (feeType === txFeeUnit.BLOCKS) {
        const val = Number(txFeesBlocks)
        if (!txFeesBlocks || !isValidNumber(val) || val < 1 || val > 1000) {
          newErrors.txFees = t('settings.fees.feedback_invalid_tx_fees_blocks', {
            min: 1,
            max: 1000,
          })
        }
      } else {
        const val = Number(txFeesSatsPerVbyte)
        if (!txFeesSatsPerVbyte || !isValidNumber(val) || val < 1.001 || val > 350) {
          newErrors.txFees = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
            min: 1.001,
            max: 350,
          })
        }
      }

      if (!txFeesFactor) {
        newErrors.txFeesFactor = t('settings.fees.feedback_invalid_tx_fees_factor', {
          min: factorToPercentage(TX_FEES_FACTOR_MIN),
          max: factorToPercentage(TX_FEES_FACTOR_MAX),
        })
      } else {
        const factorVal = percentageToFactor(Number(txFeesFactor))
        if (!isValidNumber(Number(txFeesFactor)) || factorVal < TX_FEES_FACTOR_MIN || factorVal > TX_FEES_FACTOR_MAX) {
          newErrors.txFeesFactor = t('settings.fees.feedback_invalid_tx_fees_factor', {
            min: factorToPercentage(TX_FEES_FACTOR_MIN),
            max: factorToPercentage(TX_FEES_FACTOR_MAX),
          })
        }
      }

      if (!maxSweepFeeChange) {
        newErrors.maxSweepFeeChange = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
          min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN),
          max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX),
        })
      } else {
        const sweepVal = percentageToFactor(Number(maxSweepFeeChange))
        if (
          !isValidNumber(Number(maxSweepFeeChange)) ||
          sweepVal < MAX_SWEEP_FEE_CHANGE_MIN ||
          sweepVal > MAX_SWEEP_FEE_CHANGE_MAX
        ) {
          newErrors.maxSweepFeeChange = t('settings.fees.feedback_invalid_max_sweep_fee_change', {
            min: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MIN),
            max: factorToPercentage(MAX_SWEEP_FEE_CHANGE_MAX),
          })
        }
      }
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    useEffect(() => {
      validate()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [txFeesBlocks, txFeesSatsPerVbyte, txFeesFactor, maxSweepFeeChange, feeType, enableValidation])

    useImperativeHandle(ref, () => ({
      getFormData: () => {
        if (!validate()) {
          return null
        }
        return {
          txFees: feeType === txFeeUnit.BLOCKS ? txFeesBlocks : String(Math.round(Number(txFeesSatsPerVbyte) * 1000)),
          txFeesFactor: txFeesFactor ? String(percentageToFactor(Number(txFeesFactor))) : '',
          maxSweepFeeChange: maxSweepFeeChange ? String(percentageToFactor(Number(maxSweepFeeChange))) : '',
        }
      },
      setFormData: (data: { txFees: string; txFeesFactor: string; maxSweepFeeChange: string }) => {
        // Detect unit based on value range:
        // - Blocks: 1-1000
        // - Sats/kilo-vbyte: 1001+ (minimum is 1001 according to JM validation)
        const txFeesValue = Number(data.txFees)
        if (txFeesValue >= 1001) {
          setFeeType(txFeeUnit.SATS_PER_KILO_VBYTE)
          setTxFeesSatsPerVbyte(String(txFeesValue / 1000))
          setTxFeesBlocks('')
        } else {
          setFeeType(txFeeUnit.BLOCKS)
          setTxFeesBlocks(data.txFees)
          setTxFeesSatsPerVbyte('')
        }
        const factorVal = data.txFeesFactor ? factorToPercentage(Number(data.txFeesFactor)) : ''
        const sweepVal = data.maxSweepFeeChange ? factorToPercentage(Number(data.maxSweepFeeChange)) : ''
        setTxFeesFactor(String(factorVal))
        setMaxSweepFeeChange(String(sweepVal))
        setErrors({})
      },
      resetForm: () => {
        setFeeType(txFeeUnit.BLOCKS)
        setTxFeesBlocks('3')
        setTxFeesSatsPerVbyte('')
        setTxFeesFactor('20')
        setMaxSweepFeeChange('80')
        setErrors({})
      },
      validateForm: () => validate(),
    }))

    return (
      <div>
        <p className="text-muted-foreground mb-6 text-sm">{t('settings.fees.description_general_fee_settings')}</p>

        <div className="mb-6 space-y-4">
          <h3 className="text-base font-medium">{t('settings.fees.label_tx_fees')}</h3>
          <TxFeeInputField
            value={feeType === txFeeUnit.BLOCKS ? txFeesBlocks : txFeesSatsPerVbyte}
            unit={feeType}
            onUnitChange={setFeeType}
            onValueChange={(val) => {
              if (feeType === txFeeUnit.BLOCKS) {
                setTxFeesBlocks(val)
              } else {
                setTxFeesSatsPerVbyte(val)
              }
            }}
            error={errors.txFees}
            disabled={false}
          />
        </div>

        <div className="mb-6 space-y-4">
          <Label>{t('settings.fees.label_tx_fees_factor')}</Label>
          <p className="text-muted-foreground text-sm">{t('settings.fees.description_tx_fees_factor_^0.9.10')}</p>
          <div className="flex max-w-md items-center">
            <div className="bg-muted flex h-9 items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">%</span>
            </div>
            <Input
              type="text"
              value={txFeesFactor}
              onChange={(e) => setTxFeesFactor(e.target.value)}
              placeholder="20"
              className="rounded-l-none"
            />
          </div>
          {errors.txFeesFactor && <div className="mt-1 text-xs text-red-500">{errors.txFeesFactor}</div>}
        </div>

        <div className="space-y-4">
          <Label>{t('settings.fees.label_max_sweep_fee_change')}</Label>
          <p className="text-muted-foreground text-sm">
            {t('settings.fees.description_max_sweep_fee_change', {
              defaultValue: `${factorToPercentage(JM_MAX_SWEEP_FEE_CHANGE_DEFAULT)}%`,
            })}
          </p>
          <div className="flex max-w-md items-center">
            <div className="bg-muted flex h-9 items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">%</span>
            </div>
            <Input
              type="text"
              value={maxSweepFeeChange}
              onChange={(e) => setMaxSweepFeeChange(e.target.value)}
              placeholder="80"
              className="rounded-l-none"
            />
          </div>
          {errors.maxSweepFeeChange && <div className="mt-1 text-xs text-red-500">{errors.maxSweepFeeChange}</div>}
        </div>
      </div>
    )
  },
)
