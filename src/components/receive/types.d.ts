import type { AmountSats, JarIndex } from '@/types/global'

export type SourceValue = {
  fromJar?: JarIndex
}

export type AmountValue = {
  amount?: AmountSats
}

export interface ReceiveFormValues {
  source: SourceValue
  amount: AmountValue
}
