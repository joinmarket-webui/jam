import type { VariantProps } from 'class-variance-authority'
import type { TFunction } from 'i18next'
import type { statusBadgeVariants } from '@/components/ui/jam/StatusBadge-variants'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import * as fb from './fidelityBondUtils'

/**
 * see https://github.com/joinmarket-ng/joinmarket-ng/blob/0.33.0/jmwallet/src/jmwallet/wallet/models.py#L13 (last checked 2026-07-11)
 *
 *  "deposit",  # External address with funds (received deposit)
 *  "cj-out",  # Internal address - CoinJoin output (from previous CJ)
 *  "cj-change",  # Internal address - change output from a CoinJoin tx
 *  "non-cj-change",  # Internal address - regular change (not from CJ)
 *  "new",  # Unused address (no funds, never used)
 *  "reused",  # Address that was used and reused (privacy warning)
 *  "reserved",  # Set aside/handed out by the user; do not reuse (may be labeled)
 *  "used-empty",  # Address that had funds but is now empty
 *  "bond",  # Fidelity bond address
 *  "flagged",  # Address flagged/shared but tx failed (should not reuse)
 *
 * https://github.com/joinmarket-ng/joinmarket-ng/blob/0.33.0/jmwallet/src/jmwallet/wallet/utxo_metadata.py#L57
 *  "jm:autofrozen:reuse"
 */
type JmPlainTagValue =
  | 'deposit'
  | 'cj-out'
  | 'cj-change'
  | 'non-cj-change'
  | 'new'
  | 'reused'
  | 'reserved'
  | 'used-empty'
  | 'bond'
  | 'flagged'

type AdditionalTagValue = 'jm:autofrozen:reuse'

// TODO: Verify if these tags are used by backend
type AdditionalUnverifiedTagValue = 'locked' | 'pending' | 'frozen' | 'change-out' | 'used'

type UtxoTagValue = JmPlainTagValue | AdditionalTagValue | AdditionalUnverifiedTagValue | string

type StatusBadgeVariant = VariantProps<typeof statusBadgeVariants>['variant']

const JM_PLAIN_STATUS_TAG_VARIANTS: { [key in JmPlainTagValue | AdditionalTagValue]: StatusBadgeVariant } = {
  new: 'new',
  reused: 'reused',
  'cj-out': 'cj-out',
  'cj-change': 'cj-change',
  'non-cj-change': 'non-cj-change',
  deposit: 'deposit',
  'used-empty': 'used-empty',
  flagged: 'flagged',
  bond: 'bond',
  reserved: 'reserved',
  'jm:autofrozen:reuse': 'reused',
}

const ADDITIONAL_UNVERIFIED_STATUS_TAG_VARIANTS: { [key in AdditionalUnverifiedTagValue]: StatusBadgeVariant } = {
  pending: 'pending',
  frozen: 'frozen',
  locked: 'bond',
  used: 'used-empty',
  'change-out': 'non-cj-change',
}

export const UTXO_STATUS_TAG_VARIANTS: { [key in UtxoTagValue]: StatusBadgeVariant } = {
  default: 'default',
  ...JM_PLAIN_STATUS_TAG_VARIANTS,
  ...ADDITIONAL_UNVERIFIED_STATUS_TAG_VARIANTS,
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
    const isJmLabel = utxo.label.startsWith('jm:')
    tags.push({
      value: utxo.label,
      displayValue: utxo.label,
      variant: isJmLabel ? UTXO_STATUS_TAG_VARIANTS[utxo.label] || 'default' : 'default',
    })
  }
  return tags
}
