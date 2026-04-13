import { useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { InfoIcon, PercentIcon } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CJ_FEE_ABS_MIN, CJ_FEE_ABS_MAX, CJ_FEE_REL_MIN, CJ_FEE_REL_MAX } from '@/constants/jam'
import { isValidNumber, factorToPercentage, percentageToFactor, formatSats } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { SatSymbol } from '../ui/jam/CurrencySymbol'

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

interface CollaboratorFeesFormProps {
  initialValues: {
    maxCjFeeAbs: string
    maxCjFeeRel: string
  }
  enableValidation?: boolean
}

type CollaboratorFeesFormValues = {
  maxCjFeeAbs: string
  maxCjFeeRel: string
}

export interface CollaboratorFeesFormRef {
  getFormData: () => {
    maxCjFeeAbs: string
    maxCjFeeRel: string
  } | null
  setFormData: (data: { maxCjFeeAbs: string; maxCjFeeRel: string }) => void
  resetForm: () => void
  validateForm: () => Promise<boolean>
}

export const CollaboratorFeesForm = forwardRef<CollaboratorFeesFormRef, CollaboratorFeesFormProps>(
  ({ initialValues, enableValidation = true }, ref) => {
    const { t } = useTranslation()
    const schema = useMemo(() => {
      if (!enableValidation) {
        return yup
          .object({
            maxCjFeeAbs: yup.string().default(''),
            maxCjFeeRel: yup.string().default(''),
          })
          .required()
      }

      const maxCjFeeAbsMessage = t('settings.fees.feedback_invalid_max_cj_fee_abs', {
        min: formatSats(CJ_FEE_ABS_MIN),
        max: formatSats(CJ_FEE_ABS_MAX),
      })
      const maxCjFeeRelMessage = t('settings.fees.feedback_invalid_max_cj_fee_rel', {
        min: factorToPercentage(CJ_FEE_REL_MIN),
        max: factorToPercentage(CJ_FEE_REL_MAX),
      })

      return yup
        .object({
          maxCjFeeAbs: yup
            .string()
            .test('max-cj-fee-abs', maxCjFeeAbsMessage, (value) => {
              const absoluteFeeValue = Number(value)
              return (
                !!value &&
                isValidNumber(absoluteFeeValue) &&
                absoluteFeeValue >= CJ_FEE_ABS_MIN &&
                absoluteFeeValue <= CJ_FEE_ABS_MAX
              )
            })
            .required(maxCjFeeAbsMessage),
          maxCjFeeRel: yup
            .string()
            .test('max-cj-fee-rel', maxCjFeeRelMessage, (value) => {
              const relativeFeeValue = Number(value)
              const relFactorVal = percentageToFactor(relativeFeeValue)
              return (
                !!value &&
                isValidNumber(relativeFeeValue) &&
                relFactorVal >= CJ_FEE_REL_MIN &&
                relFactorVal <= CJ_FEE_REL_MAX
              )
            })
            .required(maxCjFeeRelMessage),
        })
        .required()
    }, [enableValidation, t])

    const {
      register,
      getValues,
      reset,
      trigger,
      formState: { errors },
    } = useForm<CollaboratorFeesFormValues, unknown, CollaboratorFeesFormValues>({
      mode: 'onChange',
      defaultValues: initialValues,
      resolver: yupResolver(schema as yup.AnyObjectSchema) as Resolver<
        CollaboratorFeesFormValues,
        unknown,
        CollaboratorFeesFormValues
      >,
    })

    useEffect(() => {
      void trigger()
    }, [trigger, enableValidation])

    useImperativeHandle(
      ref,
      () => ({
        getFormData: () => {
          const values = getValues()
          if (!schema.isValidSync(values)) {
            return null
          }
          return {
            maxCjFeeAbs: values.maxCjFeeAbs,
            maxCjFeeRel: values.maxCjFeeRel ? String(percentageToFactor(Number(values.maxCjFeeRel))) : '',
          }
        },
        setFormData: (data) => {
          reset({
            maxCjFeeAbs: data.maxCjFeeAbs,
            maxCjFeeRel: data.maxCjFeeRel ? String(factorToPercentage(Number(data.maxCjFeeRel))) : '',
          })
          void trigger()
        },
        resetForm: () => {
          reset({
            maxCjFeeAbs: '',
            maxCjFeeRel: '',
          })
          void trigger()
        },
        validateForm: () => trigger(),
      }),
      [getValues, reset, schema, trigger],
    )

    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">{t('settings.fees.description_max_cj_fee_settings')}</p>

        <Alert variant="default">
          <InfoIcon className="text-muted-foreground size-4 shrink-0" />
          <AlertDescription>{t('settings.fees.subtitle_max_cj_fee')}</AlertDescription>
        </Alert>

        {/* Absolute limit field */}

        <div className="space-y-2">
          <Field data-invalid={errors.maxCjFeeAbs !== undefined}>
            <FieldLabel htmlFor="collaborator-fees-max-cj-fee-abs">
              {t('settings.fees.label_max_cj_fee_abs')}
            </FieldLabel>
            <FieldDescription className="text-xs">{t('settings.fees.description_max_cj_fee_abs')}</FieldDescription>
            <InputGroup>
              <InputGroupInput
                id="collaborator-fees-max-cj-fee-abs"
                {...register('maxCjFeeAbs')}
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
              />
              <InputGroupAddon align="inline-start">{FieldPrefixSatSymbol}</InputGroupAddon>
            </InputGroup>
          </Field>
          {errors.maxCjFeeAbs?.message && <div className="text-destructive text-xs">{errors.maxCjFeeAbs.message}</div>}
        </div>

        {/* Relative limit field */}
        <div className="space-y-2">
          <Field data-invalid={errors.maxCjFeeRel !== undefined}>
            <FieldLabel htmlFor="collaborator-fees-max-cj-fee-rel">
              {t('settings.fees.label_max_cj_fee_rel')}
            </FieldLabel>
            <FieldDescription className="text-xs">{t('settings.fees.description_max_cj_fee_rel')}</FieldDescription>
            <InputGroup>
              <InputGroupInput
                id="collaborator-fees-max-cj-fee-rel"
                {...register('maxCjFeeRel')}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
              />
              <InputGroupAddon align="inline-start">
                <PercentIcon />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {errors.maxCjFeeRel?.message && <div className="text-destructive text-xs">{errors.maxCjFeeRel.message}</div>}
        </div>
      </div>
    )
  },
)
