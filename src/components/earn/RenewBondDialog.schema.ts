import * as yup from 'yup'
import * as fb from '@/lib/fidelityBondUtils'

export type RenewBondFormValues = {
  lockdate?: fb.Lockdate
  confirmationAccepted: boolean
}

export const RENEW_BOND_FORM_DEFAULT_VALUES: RenewBondFormValues = {
  lockdate: undefined,
  confirmationAccepted: false,
}

export const renewBondFormSchema: yup.ObjectSchema<RenewBondFormValues> = yup
  .object({
    lockdate: yup.string<fb.Lockdate>().required(),
    confirmationAccepted: yup.boolean().oneOf([true]).required(),
  })
  .required()
