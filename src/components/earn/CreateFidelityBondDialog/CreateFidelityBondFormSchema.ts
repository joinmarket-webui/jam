import type { TFunction } from 'i18next'
import * as yup from 'yup'
import * as fb from '@/lib/fidelityBondUtils'
import { sourceJarField } from '@/lib/formValidation'
import type { JarIndex } from '@/types/global'

export type SourceValue = {
  fromJar?: JarIndex
}

export type CreateFidelityBondFormValues = {
  lockdate?: fb.Lockdate
  source: SourceValue
  utxoIds: string[]
  confirmationAccepted: boolean
}

export const CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES: CreateFidelityBondFormValues = {
  lockdate: undefined,
  source: {
    fromJar: undefined,
  },
  utxoIds: [],
  confirmationAccepted: false,
}

export const createFidelityBondFormSchema = (
  lockdateOptions: Array<{ value: fb.Lockdate }>,
  jarIndexes: JarIndex[],
  t: TFunction<'translation', undefined>,
): yup.ObjectSchema<CreateFidelityBondFormValues> => {
  const requiredMessage = t('global.errors.reason_unknown')
  /* TODO: i18n: provide dedicated fidelity-bond source-jar validation copy */
  const invalidSourceJarFeedbackMessage = t('receive.feedback_invalid_source_jar')
  const validLockdates = lockdateOptions.map((option) => option.value)

  return yup
    .object({
      lockdate: yup.string<fb.Lockdate>().oneOf(validLockdates, requiredMessage).required(requiredMessage),
      source: yup
        .object({
          fromJar: sourceJarField(invalidSourceJarFeedbackMessage, (jarIndex) => jarIndexes.includes(jarIndex)),
        })
        .required(),
      utxoIds: yup.array().of(yup.string().required(requiredMessage)).min(1, requiredMessage).required(requiredMessage),
      confirmationAccepted: yup.boolean().oneOf([true], requiredMessage).required(requiredMessage),
    })
    .required()
}
