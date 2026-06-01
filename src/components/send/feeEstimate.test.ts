import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TX_FEE_UNITS, toJamFeeConfigValues, type JamFeeConfigValues } from '@/lib/feeConfig'
import { estimateMaxCollaboratorFee, useMiningFeeText } from './feeEstimate'

const baseFeeConfig: JamFeeConfigValues = toJamFeeConfigValues({
  max_cj_fee_abs: '1500',
  max_cj_fee_rel: '0.005',
})

const t = (key: string, values?: Record<string, unknown>) => `${key}:${JSON.stringify(values ?? {})}`

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

  it('returns zero fee for zero collaborators or zero amount', () => {
    expect(estimateMaxCollaboratorFee(baseFeeConfig, 50_000, 0)).toEqual({ maxFee: 0, fractionOfAmount: 0 })
    expect(estimateMaxCollaboratorFee(baseFeeConfig, 0, 4)).toEqual({ maxFee: 0, fractionOfAmount: 0 })
  })

  it('throws when required max fee values are missing', () => {
    expect(() => estimateMaxCollaboratorFee({ txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS } }, 50_000, 2)).toThrow(
      'max_cj_fee_abs',
    )
    expect(() =>
      estimateMaxCollaboratorFee({ maxCjAbsoluteFee: 1_000, txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS } }, 50_000, 2),
    ).toThrow('max_cj_fee_rel')
  })
})

describe('useMiningFeeText', () => {
  it('describes block target fees', () => {
    const { result } = renderHook(() =>
      useMiningFeeText({
        feeConfigValues: {
          txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS, txFeeInBlocks: 4 },
          txFeeFactor: 0.2,
        },
        t,
      }),
    )

    expect(result.current).toBe('send.confirm_send_modal.text_miner_fee_in_targeted_blocks:{"count":4}')
  })

  it('describes exact sats/vbyte fees', () => {
    const { result } = renderHook(() =>
      useMiningFeeText({
        feeConfigValues: {
          txFee: { txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE, txFeeInSatsPerVbyte: 2 },
          txFeeFactor: 0,
        },
        t,
      }),
    )

    expect(result.current).toBe('send.confirm_send_modal.text_miner_fee_in_satspervbyte_exact:{"value":"2"}')
  })

  it('describes randomized sats/vbyte fee ranges', () => {
    const { result } = renderHook(() =>
      useMiningFeeText({
        feeConfigValues: {
          txFee: { txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE, txFeeInSatsPerVbyte: 2 },
          txFeeFactor: 0.5,
        },
        t,
      }),
    )

    expect(result.current).toBe(
      'send.confirm_send_modal.text_miner_fee_in_satspervbyte_randomized:{"min":"2","max":"3"}',
    )
  })
})
