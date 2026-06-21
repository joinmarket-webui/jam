import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FEE_CONFIG_KEYS, type ConfigKey, type ConfigValue } from '@/constants/jm'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { useFeeConfigValidation } from './useFeeConfigValidation'

const mocks = vi.hoisted(() => ({
  useJmConfig: vi.fn(),
  refetch: vi.fn(),
  fetchIfMissing: vi.fn(),
}))

vi.mock('./useJmConfig', () => ({
  useJmConfig: mocks.useJmConfig,
}))

const completeConfigState = {
  POLICY: {
    max_cj_fee_abs: '1500',
    max_cj_fee_rel: '0.00025',
    tx_fees: '2500',
    tx_fees_factor: '0.2',
    max_sweep_fee_change: '0.8',
  },
}

const configValue = (key: ConfigKey): ConfigValue => ({ key, value: `${key.section}.${key.field}` })

describe('useFeeConfigValidation', () => {
  beforeEach(() => {
    mocks.useJmConfig.mockReset()
    mocks.refetch.mockReset()
    mocks.fetchIfMissing.mockReset()

    mocks.refetch.mockImplementation((key: ConfigKey) => Promise.resolve(configValue(key)))
    mocks.fetchIfMissing.mockImplementation((key: ConfigKey) => Promise.resolve(configValue(key)))
    mocks.useJmConfig.mockReturnValue({
      state: completeConfigState,
      refetch: mocks.refetch,
      fetchIfMissing: mocks.fetchIfMissing,
    })
  })

  it('maps raw JoinMarket config values into Jam fee config values', () => {
    const { result } = renderHook(() =>
      useFeeConfigValidation({ walletFileName: 'Satoshi.jmdat', forceFeeConfigMissing: false }),
    )

    expect(mocks.useJmConfig).toHaveBeenCalledWith({ walletFileName: 'Satoshi.jmdat' })
    expect(result.current.jmRawFeeConfigValues).toEqual({
      max_cj_fee_abs: '1500',
      max_cj_fee_rel: '0.00025',
      tx_fees: '2500',
      tx_fees_factor: '0.2',
      max_sweep_fee_change: '0.8',
    })
    expect(result.current.feeConfigValues).toMatchObject({
      maxCjAbsoluteFee: 1500,
      maxCjRelativeFee: 0.00025,
      txFeeFactor: 0.2,
      maxSweepFeeChangeFactor: 0.8,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInSatsPerVbyte: 2.5,
      },
    })
    expect(result.current.maxFeesConfigMissing).toBe(false)
  })

  it('reports missing max fee config when values are absent or forced', () => {
    mocks.useJmConfig.mockReturnValueOnce({
      state: { POLICY: { tx_fees: '3' } },
      refetch: mocks.refetch,
      fetchIfMissing: mocks.fetchIfMissing,
    })

    const missing = renderHook(() =>
      useFeeConfigValidation({ walletFileName: 'Satoshi.jmdat', forceFeeConfigMissing: false }),
    )
    const forced = renderHook(() =>
      useFeeConfigValidation({ walletFileName: 'Satoshi.jmdat', forceFeeConfigMissing: true }),
    )

    expect(missing.result.current.maxFeesConfigMissing).toBe(true)
    expect(forced.result.current.maxFeesConfigMissing).toBe(true)
  })

  it('refetches and fetches every fee config key', async () => {
    const { result } = renderHook(() =>
      useFeeConfigValidation({ walletFileName: 'Satoshi.jmdat', forceFeeConfigMissing: false }),
    )

    await act(async () => {
      await result.current.refetchAll()
      await result.current.fetchMissing()
    })

    const feeConfigKeys = Object.values(FEE_CONFIG_KEYS)
    expect(mocks.refetch).toHaveBeenCalledTimes(feeConfigKeys.length)
    expect(mocks.fetchIfMissing).toHaveBeenCalledTimes(feeConfigKeys.length)
    expect(mocks.refetch.mock.calls.map(([key]) => key as ConfigKey)).toEqual(feeConfigKeys)
    expect(mocks.fetchIfMissing.mock.calls.map(([key]) => key as ConfigKey)).toEqual(feeConfigKeys)
    expect(result.current.isLoading).toBe(false)
  })
})
