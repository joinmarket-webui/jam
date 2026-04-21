import type { TFunction } from 'i18next'
import * as yup from 'yup'
import * as fb from '@/lib/fidelityBondUtils'
import type { JarIndex } from '@/types/global'

export type CreateFidelityBondFormValues = {
  lockdate?: fb.Lockdate
  jarIndex?: JarIndex
  utxoIds: string[]
  confirmationAccepted: boolean
}

export const CREATE_FIDELITY_BOND_FORM_DEFAULT_VALUES: CreateFidelityBondFormValues = {
  lockdate: undefined,
  jarIndex: undefined,
  utxoIds: [],
  confirmationAccepted: false,
}

export const createFidelityBondFormSchema = (
  lockdateOptions: Array<{ value: fb.Lockdate }>,
  t: TFunction<'translation', undefined>,
) => {
  const requiredMessage = t('global.errors.reason_unknown')
  const validLockdates = lockdateOptions.map((option) => option.value)

  return yup
    .object({
      lockdate: yup.string<fb.Lockdate>().oneOf(validLockdates, requiredMessage).required(requiredMessage),
      jarIndex: yup.number<JarIndex>().integer(requiredMessage).required(requiredMessage),
      utxoIds: yup.array().of(yup.string().required(requiredMessage)).min(1, requiredMessage).required(requiredMessage),
      confirmationAccepted: yup.boolean().oneOf([true], requiredMessage).required(requiredMessage),
    })
    .required()
}
