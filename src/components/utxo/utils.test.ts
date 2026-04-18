import type { TFunction } from 'i18next'
import { utxoTags } from './utils'
import type { Utxo, WalletInfo } from '../../context/WalletContext'

const t: TFunction = ((key: string) => key) as TFunction

const baseUtxo: Utxo = {
  address: 'bc1qtest',
  path: "m/84'/0'/0'/0/0",
  label: '',
  value: 100_000,
  tries: 0,
  tries_remaining: 0,
  external: false,
  mixdepth: 0,
  confirmations: 6,
  frozen: false,
  utxo: 'abc123:0',
  locktime: undefined,
}

const makeWalletInfo = (status: string): WalletInfo =>
  ({
    addressSummary: { bc1qtest: { status } },
    fidelityBondSummary: { fbOutputs: [] },
    utxosByJar: {},
    balanceSummary: {} as any,
    data: {} as any,
  }) as unknown as WalletInfo

describe('utxoTags', () => {
  it('returns cj-out tag for cj-out status', () => {
    const tags = utxoTags(baseUtxo, makeWalletInfo('cj-out'), t)
    expect(tags.some((tag) => tag.value === 'cj-out')).toBe(true)
    expect(tags.find((tag) => tag.value === 'cj-out')?.color).toBe('success')
  })

  it('returns danger color for reused status', () => {
    const tags = utxoTags(baseUtxo, makeWalletInfo('reused'), t)
    expect(tags.find((tag) => tag.value === 'reused')?.color).toBe('danger')
  })

  it('returns label tag when utxo has a label', () => {
    const utxoWithLabel = { ...baseUtxo, label: 'savings' }
    const tags = utxoTags(utxoWithLabel, makeWalletInfo('new'), t)
    expect(tags.some((tag) => tag.value === 'savings')).toBe(true)
  })

  it('returns fidelity bond tag for fb utxo', () => {
    const fbUtxo = { ...baseUtxo, locktime: '2099-12-01 00:00:00' }
    const tags = utxoTags(fbUtxo, makeWalletInfo('new'), t)
    expect(tags.some((tag) => tag.value === 'bond')).toBe(true)
  })

  it('strips bracket suffixes from status (e.g. "reused [FROZEN]")', () => {
    const tags = utxoTags(baseUtxo, makeWalletInfo('reused [FROZEN]'), t)
    expect(tags.some((tag) => tag.value === 'reused')).toBe(true)
    expect(tags.every((tag) => !tag.value.includes('['))).toBe(true)
  })

  it('returns no status tag when utxo has locktime', () => {
    const lockedUtxo = { ...baseUtxo, locktime: '2099-12-01 00:00:00' }
    const tags = utxoTags(lockedUtxo, makeWalletInfo('cj-out'), t)
    expect(tags.every((tag) => tag.value !== 'cj-out')).toBe(true)
  })
})
