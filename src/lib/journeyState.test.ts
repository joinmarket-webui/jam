import { describe, expect, it } from 'vitest'
import { getJourneyState } from './journeyState'

describe('getJourneyState', () => {
  it('should return loading when wallet is undefined', () => {
    expect(getJourneyState(undefined, { feeConfigMissing: false })).toBe('loading')
  })

  it('should return empty when balance is zero', () => {
    expect(getJourneyState({ balanceSats: 0 }, { feeConfigMissing: false })).toBe('empty')
  })

  it('should return needs_fee when fee config is missing', () => {
    expect(getJourneyState({ balanceSats: 1 }, { feeConfigMissing: true })).toBe('needs_fee')
  })

  it('should return ready when wallet is valid and fee config is present', () => {
    expect(getJourneyState({ balanceSats: 1 }, { feeConfigMissing: false })).toBe('ready')
  })

  it('should return loading when balance is invalid', () => {
    expect(getJourneyState({ balanceSats: undefined }, { feeConfigMissing: false })).toBe('loading')
    expect(getJourneyState({ balanceSats: null }, { feeConfigMissing: false })).toBe('loading')
    expect(getJourneyState({ balanceSats: Number.NaN }, { feeConfigMissing: false })).toBe('loading')
  })
})
