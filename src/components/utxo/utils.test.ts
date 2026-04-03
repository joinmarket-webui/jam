import type { TFunction } from 'i18next'
import { Utxo } from '../../context/WalletContext'
import * as fb from '../fb/utils'
import { utxoTags } from './utils'

jest.mock('../fb/utils', () => ({
  ...jest.requireActual('../fb/utils'),
  utxo: {
    ...jest.requireActual('../fb/utils').utxo,
    isFidelityBond: jest.fn(),
  },
}))

const makeUtxo = (overrides: Partial<Utxo> = {}) =>
  ({
    address: 'bc1qexampleaddress',
    path: 'm/0/0',
    label: '',
    value: 0,
    tries: 0,
    tries_remaining: 0,
    external: false,
    mixdepth: 0,
    confirmations: 0,
    frozen: false,
    utxo: 'deadbeef:0',
    ...overrides,
  }) as Utxo

const makeWalletInfo = (status?: string, address = 'bc1qexampleaddress') =>
  ({
    addressSummary: status ? { [address]: { address, status } } : {},
  }) as any

describe('utxoTags', () => {
  const t = ((key: string) => key) as unknown as TFunction

  beforeEach(() => {
    ;(fb.utxo.isFidelityBond as jest.Mock).mockReturnValue(false)
  })

  it('parses the leading status and keeps the label tag', () => {
    const tags = utxoTags(makeUtxo({ label: 'saved for fees' }), makeWalletInfo('reused [FROZEN]'), t)

    expect(tags).toEqual([
      { value: 'reused', displayValue: 'reused', color: 'danger' },
      { value: 'saved for fees', displayValue: 'saved for fees', color: 'normal' },
    ])
  })

  it('ignores address status when the utxo is timelocked', () => {
    const tags = utxoTags(makeUtxo({ locktime: '2099-12-01', label: 'locked output' }), makeWalletInfo('cj-out'), t)

    expect(tags).toEqual([{ value: 'locked output', displayValue: 'locked output', color: 'normal' }])
  })

  it('adds the fidelity bond tag first when applicable', () => {
    ;(fb.utxo.isFidelityBond as jest.Mock).mockReturnValue(true)

    const tags = utxoTags(makeUtxo({ label: 'fb output' }), makeWalletInfo('cj-out'), t)

    expect(tags).toEqual([
      { value: 'bond', displayValue: 'jar_details.utxo_list.utxo_tag_fb', color: 'dark' },
      { value: 'cj-out', displayValue: 'cj-out', color: 'success' },
      { value: 'fb output', displayValue: 'fb output', color: 'normal' },
    ])
  })
})
