import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { InfoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CJ_FEE_ABS_MIN, CJ_FEE_ABS_MAX, CJ_FEE_REL_MIN, CJ_FEE_REL_MAX } from '@/constants/jam'
import { isValidNumber, factorToPercentage, percentageToFactor } from '@/lib/utils'

interface CollaboratorFeesFormProps {
  initialValues: {
    maxCjFeeAbs: string
    maxCjFeeRel: string
  }
  enableValidation?: boolean
}

export interface CollaboratorFeesFormRef {
  getFormData: () => {
    maxCjFeeAbs: string
    maxCjFeeRel: string
  } | null
  setFormData: (data: { maxCjFeeAbs: string; maxCjFeeRel: string }) => void
  resetForm: () => void
  validateForm: () => boolean
}

export const CollaboratorFeesForm = forwardRef<CollaboratorFeesFormRef, CollaboratorFeesFormProps>(
  ({ initialValues, enableValidation = true }, ref) => {
    const { t } = useTranslation()
    const [maxCjFeeAbs, setMaxCjFeeAbs] = useState(initialValues.maxCjFeeAbs)
    const [maxCjFeeRel, setMaxCjFeeRel] = useState(initialValues.maxCjFeeRel)
    const [errors, setErrors] = useState<{ maxCjFeeAbs?: string; maxCjFeeRel?: string }>({})

    const validate = useCallback(() => {
      if (!enableValidation) {
        setErrors({})
        return true
      }
      const absoluteFeeValue = Number(maxCjFeeAbs)
      const relativeFeeValue = Number(maxCjFeeRel)
      const newErrors: { maxCjFeeAbs?: string; maxCjFeeRel?: string } = {}

      if (!maxCjFeeAbs) {
        newErrors.maxCjFeeAbs = t('settings.fees.feedback_invalid_max_cj_fee_abs', {
          min: CJ_FEE_ABS_MIN,
          max: CJ_FEE_ABS_MAX,
        })
      } else if (
        !isValidNumber(absoluteFeeValue) ||
        absoluteFeeValue < CJ_FEE_ABS_MIN ||
        absoluteFeeValue > CJ_FEE_ABS_MAX
      ) {
        newErrors.maxCjFeeAbs = t('settings.fees.feedback_invalid_max_cj_fee_abs', {
          min: CJ_FEE_ABS_MIN,
          max: CJ_FEE_ABS_MAX,
        })
      }

      if (!maxCjFeeRel) {
        newErrors.maxCjFeeRel = t('settings.fees.feedback_invalid_max_cj_fee_rel', {
          min: factorToPercentage(CJ_FEE_REL_MIN),
          max: factorToPercentage(CJ_FEE_REL_MAX),
        })
      } else {
        const relFactorVal = percentageToFactor(relativeFeeValue)
        if (!isValidNumber(relativeFeeValue) || relFactorVal < CJ_FEE_REL_MIN || relFactorVal > CJ_FEE_REL_MAX) {
          newErrors.maxCjFeeRel = t('settings.fees.feedback_invalid_max_cj_fee_rel', {
            min: factorToPercentage(CJ_FEE_REL_MIN),
            max: factorToPercentage(CJ_FEE_REL_MAX),
          })
        }
      }
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }, [enableValidation, maxCjFeeAbs, maxCjFeeRel, t])

    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validate()
    }, [maxCjFeeAbs, maxCjFeeRel, validate, enableValidation])

    useImperativeHandle(ref, () => ({
      getFormData: () => {
        if (!validate()) return null
        return {
          maxCjFeeAbs,
          maxCjFeeRel: maxCjFeeRel ? String(percentageToFactor(Number(maxCjFeeRel))) : '',
        }
      },
      setFormData: (data) => {
        setMaxCjFeeAbs(data.maxCjFeeAbs)
        const relVal = data.maxCjFeeRel ? factorToPercentage(Number(data.maxCjFeeRel)) : ''
        setMaxCjFeeRel(String(relVal))
        setErrors({})
      },
      resetForm: () => {
        setMaxCjFeeAbs('')
        setMaxCjFeeRel('')
        setErrors({})
      },
      validateForm: () => validate(),
    }))

    return (
      <div>
        <p className="text-muted-foreground mb-6 text-sm">{t('settings.fees.description_max_cj_fee_settings')}</p>

        <Alert variant="default" className="mb-6">
          <InfoIcon className="text-muted-foreground size-4 shrink-0" />
          <AlertDescription>{t('settings.fees.subtitle_max_cj_fee')}</AlertDescription>
        </Alert>

        {/* Absolute limit field */}
        <div className="mb-6 space-y-2">
          <Label htmlFor="max-cj-fee-abs">{t('settings.fees.label_max_cj_fee_abs')}</Label>
          <p className="text-muted-foreground text-xs">{t('settings.fees.description_max_cj_fee_abs')}</p>
          <div className="flex h-12 items-center">
            <div className="bg-muted flex h-full items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">₿</span>
            </div>
            <Input
              id="max-cj-fee-abs"
              type="text"
              value={maxCjFeeAbs}
              onChange={(event) => setMaxCjFeeAbs(event.target.value)}
              placeholder="0.00 007 517"
              className="h-full rounded-l-none"
            />
          </div>
          {errors.maxCjFeeAbs && <div className="text-desctructive mt-1 text-xs">{errors.maxCjFeeAbs}</div>}
        </div>

        {/* Relative limit field */}
        <div className="space-y-2">
          <Label htmlFor="max-cj-fee-rel">{t('settings.fees.label_max_cj_fee_rel')}</Label>
          <p className="text-muted-foreground text-xs">{t('settings.fees.description_max_cj_fee_rel')}</p>
          <div className="flex h-12 items-center">
            <div className="bg-muted flex h-full items-center rounded-l-md border border-r-0 px-3 py-2">
              <span className="text-sm font-medium">%</span>
            </div>
            <Input
              id="max-cj-fee-rel"
              type="text"
              value={maxCjFeeRel}
              onChange={(event) => setMaxCjFeeRel(event.target.value)}
              placeholder="0.03"
              className="h-full rounded-l-none"
            />
          </div>
          {errors.maxCjFeeRel && <div className="text-desctructive mt-1 text-xs">{errors.maxCjFeeRel}</div>}
        </div>
      </div>
    )
  },
)
