import { TFunction } from 'i18next'
import { Utxo, WalletInfo } from '../../context/WalletContext'
import * as fb from '../fb/utils'

const ADDRESS_STATUS_COLORS: { [key: string]: string } = {
  new: 'normal',
  used: 'normal',
  reused: 'danger',
  'cj-out': 'success',
  'change-out': 'warning',
  'non-cj-change': 'normal',
  deposit: 'normal',
}

export type Tag = { tag: string; color: string }

export const utxoTags = (utxo: Utxo, walletInfo: WalletInfo, t: TFunction): Tag[] => {
  const rawStatus = walletInfo.addressSummary[utxo.address]?.status

  let status: string | null = null

  // If a UTXO is locked, it's `status` will be the locktime, with other states
  // appended in brackets, e.g. `2099-12-01 [LOCKED] [FROZEN]`
  if (rawStatus && !utxo.locktime) {
    const indexOfOtherTag = rawStatus.indexOf('[')

    if (indexOfOtherTag !== -1) {
      status = rawStatus.substring(0, indexOfOtherTag).trim()
    } else {
      status = rawStatus
    }
  }

  const tags: Tag[] = []

  if (status) tags.push({ tag: status, color: ADDRESS_STATUS_COLORS[status] || 'normal' })
  if (fb.utxo.isFidelityBond(utxo)) tags.push({ tag: t('jar_details.utxo_list.utxo_tag_fb'), color: 'dark' })
  if (utxo.label) tags.push({ tag: utxo.label, color: 'normal' })
  return tags
}
