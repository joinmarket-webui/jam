import { describe, it, expect } from 'vitest'
import { MAX_TX_FEE_IN_BLOCKS, MIN_TX_FEE_IN_SATS_PER_VBYTE } from '@/components/send/TxFeeForm.schema'
import { isMaxFeesConfigMissing, toJamFeeConfigValues, TX_FEE_UNITS } from './feeConfig'

describe('toJamFeeConfigValues', () => {
  it('should parse raw values successfully', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
      tx_fees: '3',
      tx_fees_factor: '0.2',
      max_sweep_fee_change: '0.8',
    })

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: 1500,
      maxCjRelativeFee: 0.00025,
      txFeeFactor: 0.2,
      maxSweepFeeChangeFactor: 0.8,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 3,
        txFeeInSatsPerVbyte: undefined,
      },
    })
  })

  it('should parse maximum "tx_fee" in "blocks" successfully', () => {
    const values = toJamFeeConfigValues({
      tx_fees: String(MAX_TX_FEE_IN_BLOCKS),
    })

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: undefined,
      maxCjRelativeFee: undefined,
      txFeeFactor: undefined,
      maxSweepFeeChangeFactor: undefined,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: MAX_TX_FEE_IN_BLOCKS,
        txFeeInSatsPerVbyte: undefined,
      },
    })
  })

  it('should parse "tx_fee" in "sats/vbyte" successfully', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: String(1_234),
      max_cj_fee_rel: String(1 + 1 / 3),
      tx_fees: String(1_234),
      tx_fees_factor: String(1 / 3),
      max_sweep_fee_change: String(2 / 3),
    })

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: 1_234,
      maxCjRelativeFee: 1.3333333333333333,
      txFeeFactor: 0.3333333333333333,
      maxSweepFeeChangeFactor: 0.6666666666666666,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInBlocks: undefined,
        txFeeInSatsPerVbyte: 1.234,
      },
    })
  })

  it('should parse minimum "tx_fee" in "sats/vbyte" successfully', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: String(1),
      max_cj_fee_rel: String(1 + 1 / 3),
      tx_fees: String(Math.round(MIN_TX_FEE_IN_SATS_PER_VBYTE * 1_000)),
      tx_fees_factor: String(1 / 3),
      max_sweep_fee_change: String(2 / 3),
    })

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: 1,
      maxCjRelativeFee: 1.3333333333333333,
      txFeeFactor: 0.3333333333333333,
      maxSweepFeeChangeFactor: 0.6666666666666666,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInBlocks: undefined,
        txFeeInSatsPerVbyte: MIN_TX_FEE_IN_SATS_PER_VBYTE,
      },
    })
  })

  it('should parse empty values successfully', () => {
    const values = toJamFeeConfigValues({})

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: undefined,
      maxCjRelativeFee: undefined,
      txFeeFactor: undefined,
      maxSweepFeeChangeFactor: undefined,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: undefined,
        txFeeInSatsPerVbyte: undefined,
      },
    })
  })

  it('should parse partial values successfully', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: String(-1),
      tx_fees: String(999_999),
      max_sweep_fee_change: String(Number.NaN),
    })

    expect(values).toStrictEqual({
      maxCjAbsoluteFee: -1,
      maxCjRelativeFee: undefined,
      txFeeFactor: undefined,
      maxSweepFeeChangeFactor: undefined,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInBlocks: undefined,
        txFeeInSatsPerVbyte: 999.999,
      },
    })
  })
})

describe('isMaxFeesConfigMissing', () => {
  it('should return false when values is undefined', () => {
    expect(isMaxFeesConfigMissing(undefined)).toBe(false)
  })

  it('should treat empty string as missing', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '',
      max_cj_fee_rel: '',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should treat invalid max_cj_fee_abs value as missing', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: 'NaN',
      max_cj_fee_rel: '0.00025',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should treat invalid max_cj_fee_rel value as missing', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: 'NaN',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return false when both max fee values are present', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
      tx_fees: '3',
      tx_fees_factor: '0.2',
      max_sweep_fee_change: '0.8',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })

  it('should return true when max_cj_fee_abs is missing', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_rel: '0.00025',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return true when max_cj_fee_rel is missing', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '1500',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return true when both max fee values are missing', () => {
    const values = toJamFeeConfigValues({
      tx_fees: '3',
      tx_fees_factor: '0.2',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(true)
  })

  it('should return false with zero-value strings', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '0',
      max_cj_fee_rel: '0',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })

  it('should not be affected by other fee fields', () => {
    const values = toJamFeeConfigValues({
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
    })
    expect(isMaxFeesConfigMissing(values)).toBe(false)
  })
})
