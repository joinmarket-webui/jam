import { describe, it, expect } from 'vitest'
import { normalizeTag, statusTags } from './tags'

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
})
