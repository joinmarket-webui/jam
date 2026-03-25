import type { AmountSats, JarIndex } from '@/types/global'

export type SourceValue = {
  fromJar?: JarIndex
}
export interface ReceiveFormValues {
  source: SourceValue
  amount?: AmountSats
}
