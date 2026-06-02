import type { TFunction } from 'i18next'
import { describe, it, expect } from 'vitest'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { normalizeTag, statusTags, utxoTags } from './tags'

const t = ((key: string) => `translated:${key}`) as unknown as TFunction<'translation', undefined>

describe('tags', () => {
  describe('normalizeTag', () => {
    it('should normalize tags', () => {
      expect(normalizeTag('')).toStrictEqual([])
      expect(normalizeTag('with whitespace')).toStrictEqual(['with whitespace'])
      expect(normalizeTag('tags [a tag]')).toStrictEqual(['tags'])

      expect(normalizeTag('new')).toStrictEqual(['new'])
      expect(normalizeTag('cj-out')).toStrictEqual(['cj-out'])
      expect(normalizeTag('reused [FROZEN]')).toStrictEqual(['reused'])
      expect(normalizeTag('2099-12-01 [LOCKED] [FROZEN] [PENDING]')).toStrictEqual(['2099-12-01'])
    })
  })
  describe('statusTags', () => {
    it('should derive status tags', () => {
      expect(statusTags('')).toStrictEqual([])
      expect(statusTags('UNKNOWN STATUS')).toStrictEqual([
        {
          displayValue: 'UNKNOWN STATUS',
          value: 'UNKNOWN STATUS',
          variant: 'default',
        },
      ])
      expect(statusTags('new')).toStrictEqual([
        {
          displayValue: 'new',
          value: 'new',
          variant: 'new',
        },
      ])
      expect(statusTags('cj-out')).toStrictEqual([
        {
          displayValue: 'cj-out',
          value: 'cj-out',
          variant: 'cj-out',
        },
      ])
      expect(statusTags('reused [FROZEN]')).toStrictEqual([
        {
          displayValue: 'reused',
          value: 'reused',
          variant: 'reused',
        },
      ])
      expect(statusTags('2099-12-01 [LOCKED] [FROZEN] [PENDING]')).toStrictEqual([
        {
          displayValue: '2099-12-01',
          value: '2099-12-01',
          variant: 'default',
        },
      ])
    })
  })
  describe('utxoTags', () => {
    it('should derive status and label tags for normal UTXOs', () => {
      expect(
        utxoTags(
          { address: 'bcrt1address', label: 'savings' } as Utxo,
          { bcrt1address: { status: 'cj-out' } } as unknown as AddressSummary,
          t,
        ),
      ).toStrictEqual([
        {
          displayValue: 'cj-out',
          value: 'cj-out',
          variant: 'cj-out',
        },
        {
          displayValue: 'savings',
          value: 'savings',
          variant: 'default',
        },
      ])
    })

    it('should prefer fidelity-bond tag and ignore raw status for locked UTXOs', () => {
      expect(
        utxoTags(
          {
            address: 'bcrt1bond',
            locktime: '2099-12',
            path: "m/84'/1'/0'/0/2:4102444800",
          } as unknown as Utxo,
          { bcrt1bond: { status: 'reused [FROZEN]' } } as unknown as AddressSummary,
          t,
        ),
      ).toStrictEqual([
        {
          displayValue: 'translated:jar_details.utxo_list.utxo_tag_fb',
          value: 'bond',
          variant: 'fidelity-bond',
        },
      ])
    })
  })
})
