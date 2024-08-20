import { TFunction } from 'i18next'
import { Utxo, WalletInfo } from '../../context/WalletContext'
import * as fb from '../fb/utils'

export type UtxoStatus = 'new' | 'used' | 'reused' | 'cj-out' | 'non-cj-change' | 'change-out' | 'deposit' | string

const UTXO_STATUS_COLORS: { [key in UtxoStatus]: string } = {
  new: 'normal',
  used: 'normal',
  reused: 'danger',
  'cj-out': 'success',
  'change-out': 'warning',
  'non-cj-change': 'warning',
  deposit: 'normal',
}

export type UtxoTag = { value: UtxoStatus; displayValue: string; color: string }

export const utxoTags = (utxo: Utxo, walletInfo: WalletInfo, t: TFunction): UtxoTag[] => {
  const rawStatus = walletInfo.addressSummary[utxo.address]?.status

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
    tags.push({ value: 'bond', displayValue: t('jar_details.utxo_list.utxo_tag_fb'), color: 'dark' })
  if (status) tags.push({ value: status, displayValue: status, color: UTXO_STATUS_COLORS[status] || 'normal' })
  if (utxo.label) tags.push({ value: utxo.label, displayValue: utxo.label, color: 'normal' })
  return tags
}
