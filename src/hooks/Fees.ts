import { useCallback } from 'react'
import { useRefreshConfigValues } from '../context/ServiceConfigContext'

export const FEE_CONFIG_KEYS = {
  tx_fees: { section: 'POLICY', field: 'tx_fees' },
  tx_fees_factor: { section: 'POLICY', field: 'tx_fees_factor' },
  max_cj_fee_abs: { section: 'POLICY', field: 'max_cj_fee_abs' },
  max_cj_fee_rel: { section: 'POLICY', field: 'max_cj_fee_rel' },
}

export interface FeeValues {
  tx_fees?: number
  tx_fees_factor?: number
  max_cj_fee_abs?: number
  max_cj_fee_rel?: number
}

export const useLoadFeeConfigValues = () => {
  const refreshConfigValues = useRefreshConfigValues()

  return useCallback(
    async (signal?: AbortSignal) => {
      const serviceConfig = await refreshConfigValues({
        signal,
        keys: Object.values(FEE_CONFIG_KEYS),
      })

      const policy = serviceConfig['POLICY'] || {}

      const feeValues: FeeValues = {
        tx_fees: parseInt(policy.tx_fees || '', 10) || undefined,
        tx_fees_factor: parseFloat(policy.tx_fees_factor || '') || undefined,
        max_cj_fee_abs: parseInt(policy.max_cj_fee_abs || '', 10) || undefined,
        max_cj_fee_rel: parseFloat(policy.max_cj_fee_rel || '') || undefined,
      }
      return feeValues
    },
    [refreshConfigValues]
  )
}
