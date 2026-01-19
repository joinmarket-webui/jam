import type { VariantProps } from 'class-variance-authority'
import type { TFunction } from 'i18next'
import type { statusBadgeVariants } from '@/components/ui/jam/StatusBadge-variants'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from './fidelityBondUtils'

type JmPlainTagValue = 'new' | 'used' | 'reused' | 'cj-out' | 'non-cj-change' | 'change-out' | 'deposit'
type AdditionalTagValue = 'locked' | 'pending' | 'frozen'
type UtxoTagValue = JmPlainTagValue | AdditionalTagValue | 'bond' | string

type StatusBadgeVariant = VariantProps<typeof statusBadgeVariants>['variant']

const JM_PLAIN_STATUS_TAG_VARIANTS: { [key in JmPlainTagValue]: StatusBadgeVariant } = {
  new: 'new',
  used: 'used',
  reused: 'reused',
  'cj-out': 'cj-out',
  'change-out': 'change-out',
  'non-cj-change': 'non-cj-change',
  deposit: 'deposit',
}

const ADDITIONAL_STATUS_TAG_VARIANTS: { [key in AdditionalTagValue]: StatusBadgeVariant } = {
  locked: 'locked',
  pending: 'pending',
  frozen: 'frozen',
}

export const UTXO_STATUS_TAG_VARIANTS: { [key in UtxoTagValue]: StatusBadgeVariant } = {
  ...JM_PLAIN_STATUS_TAG_VARIANTS,
  ...ADDITIONAL_STATUS_TAG_VARIANTS,
  bond: 'fidelity-bond',
}

export type UtxoTag = { value: UtxoTagValue; displayValue: string; variant: StatusBadgeVariant }

export const normalizeTag = (value: string): UtxoTagValue[] => {
  // If a UTXO is locked, its `status` will be the locktime, with other states
  // appended in brackets, e.g. `2099-12-01 [LOCKED] [FROZEN] [PENDING]`
  // other possible values include `cj-out`, `reused [FROZEN]`, etc.
  const indexOfBracket = value.indexOf('[')
  if (indexOfBracket === -1) {
    const val = value.trim()
    return val ? [val] : []
  }

  return normalizeTag(value.substring(0, indexOfBracket).trim())
}

export const statusTags = (rawStatus: string | undefined): UtxoTag[] => {
  const statusTags: string[] = rawStatus ? normalizeTag(rawStatus) : []
  const tags: UtxoTag[] = statusTags.map((it) => ({
    value: it,
    displayValue: it,
    variant: UTXO_STATUS_TAG_VARIANTS[it] || 'default',
  }))
  return tags
}

export const utxoTags = (utxo: Utxo, addressSummary: AddressSummary, t: TFunction): UtxoTag[] => {
  const rawStatus = addressSummary[utxo.address]?.status

  const __statusTags: UtxoTag[] = rawStatus && !utxo.locktime ? statusTags(rawStatus) : []
  const tags: UtxoTag[] = []

  if (fb.utxo.isFidelityBond(utxo)) {
    tags.push({
      value: 'bond',
      displayValue: t('jar_details.utxo_list.utxo_tag_fb'),
      variant: UTXO_STATUS_TAG_VARIANTS['bond'],
    })
  }

  __statusTags.forEach((it) => tags.push(it))

  if (utxo.label) {
    tags.push({ value: utxo.label, displayValue: utxo.label, variant: 'default' })
  }
  return tags
}
