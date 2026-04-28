import type { TFunction } from 'i18next'
import * as yup from 'yup'
import * as fb from '@/lib/fidelityBondUtils'
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
) => {
  const requiredMessage = t('global.errors.reason_unknown')
  const invalidSourceJarFeedbackMessage = t('receive.feedback_invalid_source_jar', {
    /* TODO: i18n: provide dedicated fidelity-bond source-jar validation copy */
    defaultValue: 'Please select a source jar.',
  })
  const validLockdates = lockdateOptions.map((option) => option.value)

  return yup
    .object({
      lockdate: yup.string<fb.Lockdate>().oneOf(validLockdates, requiredMessage).required(requiredMessage),
      source: yup
        .object({
          fromJar: yup
            .number<JarIndex>()
            .integer(invalidSourceJarFeedbackMessage)
            .required(invalidSourceJarFeedbackMessage)
            .test(
              'valid-source-jar-index-test',
              invalidSourceJarFeedbackMessage,
              (value) => typeof value === 'number' && jarIndexes.includes(value),
            ),
        })
        .required(),
      utxoIds: yup.array().of(yup.string().required(requiredMessage)).min(1, requiredMessage).required(requiredMessage),
      confirmationAccepted: yup.boolean().oneOf([true], requiredMessage).required(requiredMessage),
    })
    .required()
}
