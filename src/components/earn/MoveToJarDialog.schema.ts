import * as yup from 'yup'
import type { JarIndex } from '@/types/global'

export type MoveToJarFormValues = {
  destinationJarIndex: JarIndex
}

export const createMoveToJarFormSchema = (availableJarIndexes: JarIndex[]): yup.ObjectSchema<MoveToJarFormValues> =>
  yup
    .object({
      destinationJarIndex: yup.number().oneOf(availableJarIndexes).required(),
    })
    .required()
