import { describe, expect, it } from 'vitest'
import type { FeeConfigValues } from '@/hooks/useFeeConfigValidation'
import { estimateMaxCollaboratorFee } from './feeEstimate'

const baseFeeConfig: FeeConfigValues = {
  max_cj_fee_abs: '1500',
  max_cj_fee_rel: '0.005',
}

describe('estimateMaxCollaboratorFee', () => {
  it('uses relative fee when it is larger than absolute', () => {
    const result = estimateMaxCollaboratorFee(baseFeeConfig, 1_000_000, 2)

    expect(result.maxFee).toBe(10_000)
    expect(result.fractionOfAmount).toBe(0.01)
  })

  it('uses absolute fee floor when relative fee is too small', () => {
    const result = estimateMaxCollaboratorFee(baseFeeConfig, 10_000, 2)

    expect(result.maxFee).toBe(3_000)
    expect(result.fractionOfAmount).toBe(0.3)
  })

  it('caps total fee at full amount', () => {
    const result = estimateMaxCollaboratorFee(baseFeeConfig, 2_000, 99)

    expect(result.maxFee).toBe(2_000)
    expect(result.fractionOfAmount).toBe(1)
  })
})
