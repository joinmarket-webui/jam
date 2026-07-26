import * as yup from 'yup'
import type { JarIndex } from '@/types/global'

export type JarSelectorDialogFormValues = {
  jarIndex: JarIndex
}

export const createJarSelectorDialogFormSchema = (
  selectableJarIndexes: JarIndex[],
): yup.ObjectSchema<JarSelectorDialogFormValues> =>
  yup
    .object({
      jarIndex: yup.number().oneOf(selectableJarIndexes).required(),
    })
    .required()
