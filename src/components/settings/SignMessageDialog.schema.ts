import type { TFunction } from 'i18next'
import * as yup from 'yup'

export type SignMessageFormValues = {
  addressOrPath: string
  message: string
}

export const SIGN_MESSAGE_FORM_DEFAULT_VALUES: SignMessageFormValues = {
  addressOrPath: '',
  message: '',
}

export const createSignMessageDialogSchema = ({
  t,
}: {
  t: TFunction<'translation', undefined>
}): yup.ObjectSchema<SignMessageFormValues> =>
  yup
    .object({
      addressOrPath: yup.string().trim().required(t('settings.sign_message_modal.feedback_invalid_address')),
      message: yup.string().trim().required(t('settings.sign_message_modal.feedback_invalid_message')),
    })
    .required()
