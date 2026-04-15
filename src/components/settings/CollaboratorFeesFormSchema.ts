import type { TFunction } from 'i18next'
import * as yup from 'yup'
import { CJ_FEE_ABS_MAX, CJ_FEE_ABS_MIN, CJ_FEE_REL_MAX, CJ_FEE_REL_MIN } from '@/constants/jam'
import { factorToPercentage, formatSats } from '@/lib/utils'
import type { AmountSats } from '@/types/global'

export type CollaboratorFeesFormValues = {
  maxCjFeeAbs?: AmountSats
  maxCjFeeRelInPercent?: number
}

export function collaboratorFeesFormSchema(enableFormValidation: boolean, t: TFunction<'translation', undefined>) {
  if (!enableFormValidation) {
    return yup
      .object({
        maxCjFeeAbs: yup.string().default(''),
        maxCjFeeRelInPercent: yup.string().default(''),
      })
      .required()
  }

  const maxCjFeeAbsoluteMessage = t('settings.fees.feedback_invalid_max_cj_fee_abs', {
    min: formatSats(CJ_FEE_ABS_MIN),
    max: formatSats(CJ_FEE_ABS_MAX),
  })
  const maxCjFeeRelativeMessage = t('settings.fees.feedback_invalid_max_cj_fee_rel', {
    min: factorToPercentage(CJ_FEE_REL_MIN),
    max: factorToPercentage(CJ_FEE_REL_MAX),
  })

  return yup
    .object({
      maxCjFeeAbs: yup
        .number()
        .integer(maxCjFeeAbsoluteMessage)
        .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
        .min(CJ_FEE_ABS_MIN, maxCjFeeAbsoluteMessage)
        .max(CJ_FEE_ABS_MAX, maxCjFeeAbsoluteMessage)
        .required(maxCjFeeAbsoluteMessage),
      maxCjFeeRelInPercent: yup
        .number()
        .transform((value) => (Number.isFinite(value) ? Number(value) : null))
        .min(factorToPercentage(CJ_FEE_REL_MIN), maxCjFeeRelativeMessage)
        .max(factorToPercentage(CJ_FEE_REL_MAX), maxCjFeeRelativeMessage)
        .required(maxCjFeeRelativeMessage),
    })
    .required()
}
