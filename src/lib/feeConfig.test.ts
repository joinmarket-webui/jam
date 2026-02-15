import { describe, it, expect } from 'vitest'
import { isMaxFeesConfigMissing, type FeeConfigValues } from './feeConfig'

describe('isMaxFeesConfigMissing', () => {
  it('should return false when both max fee values are present', () => {
    const values: FeeConfigValues = {
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
      tx_fees: '3',
      tx_fees_factor: '0.2',
      max_sweep_fee_change: '0.8',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })

  it('should return true when max_cj_fee_abs is missing', () => {
    const values: FeeConfigValues = {
      max_cj_fee_rel: '0.00025',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return true when max_cj_fee_rel is missing', () => {
    const values: FeeConfigValues = {
      max_cj_fee_abs: '1500',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return true when both max fee values are missing', () => {
    const values: FeeConfigValues = {
      tx_fees: '3',
      tx_fees_factor: '0.2',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return false when values is undefined', () => {
    expect(isMaxFeesConfigMissing(undefined)).toBe(false)
  })

  it('should return false with zero-value strings', () => {
    const values: FeeConfigValues = {
      max_cj_fee_abs: '0',
      max_cj_fee_rel: '0',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })

  it('should treat empty string as present', () => {
    const values: FeeConfigValues = {
      max_cj_fee_abs: '',
      max_cj_fee_rel: '',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })

  it('should not be affected by other fee fields', () => {
    const values: FeeConfigValues = {
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
    }
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })
})
