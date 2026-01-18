import type { VariantProps } from 'class-variance-authority'
import type { TFunction } from 'i18next'
import type { utxoTagVariants } from '@/components/ui/jam/UtxoTag-variants'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from '@/lib/fidelityBondUtils'

export type UtxoStatus = 'new' | 'used' | 'reused' | 'cj-out' | 'non-cj-change' | 'change-out' | 'deposit' | string

type UtxoTagVariant = VariantProps<typeof utxoTagVariants>['variant']

export const UTXO_STATUS_VARIANTS: { [key in UtxoStatus]: UtxoTagVariant } = {
  new: 'new',
  used: 'used',
  reused: 'reused',
  'cj-out': 'cj-out',
  'change-out': 'change-out',
  'non-cj-change': 'non-cj-change',
  deposit: 'deposit',
  bond: 'fidelity-bond',
}

export type UtxoTag = { value: UtxoStatus; displayValue: string; variant: UtxoTagVariant }

export const utxoTags = (utxo: Utxo, addressSummary: AddressSummary, t: TFunction): UtxoTag[] => {
  const rawStatus = addressSummary[utxo.address]?.status

  let status: string | null = null

  // If a UTXO is locked, it's `status` will be the locktime, with other states
  // appended in brackets, e.g. `2099-12-01 [LOCKED] [FROZEN]`
  // other possible values include `cj-out`, `reused [FROZEN]`, etc.
  if (rawStatus && !utxo.locktime) {
    const indexOfOtherTag = rawStatus.indexOf('[')

    if (indexOfOtherTag !== -1) {
      status = rawStatus.substring(0, indexOfOtherTag).trim()
    } else {
      status = rawStatus
    }
  }

  const tags: UtxoTag[] = []

  if (fb.utxo.isFidelityBond(utxo))
    tags.push({
      value: 'bond',
      displayValue: t('jar_details.utxo_list.utxo_tag_fb'),
      variant: UTXO_STATUS_VARIANTS['bond'],
    })
  if (status) tags.push({ value: status, displayValue: status, variant: UTXO_STATUS_VARIANTS[status] || 'default' })
  if (utxo.label) tags.push({ value: utxo.label, displayValue: utxo.label, variant: 'default' })
  return tags
}
