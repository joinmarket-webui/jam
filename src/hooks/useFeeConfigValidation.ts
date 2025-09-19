import { useCallback, useMemo, useState } from 'react'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import type { WalletFileName } from '@/lib/utils'
import { useJmConfig } from './useJmConfig'

//TODO: needs testing!

export interface FeeConfigValues {
  max_cj_fee_abs?: string
  max_cj_fee_rel?: string
  tx_fees?: string
  tx_fees_factor?: string
  max_sweep_fee_change?: string
}

interface UseFeeConfigValidationProps {
  walletFileName: WalletFileName
}

export const useFeeConfigValidation = ({ walletFileName }: UseFeeConfigValidationProps) => {
  const { get: getConfig, refetch: fetchConfig, fetchIfMissing: fetchConfigIfMissing } = useJmConfig({ walletFileName })
  const [isLoading, setIsLoading] = useState(false)

  // Debug flag to force fee config missing error for testing
  const forceFeeConfigMissing = import.meta.env.DEV && import.meta.env.VITE_FORCE_FEE_CONFIG_MISSING === 'true'

  const feeConfigValues = useMemo<FeeConfigValues | undefined>(() => {
    return {
      max_cj_fee_abs: getConfig(FEE_CONFIG_KEYS['max_cj_fee_abs'])?.value ?? undefined,
      max_cj_fee_rel: getConfig(FEE_CONFIG_KEYS['max_cj_fee_rel'])?.value ?? undefined,
      tx_fees: getConfig(FEE_CONFIG_KEYS['tx_fees'])?.value ?? undefined,
      tx_fees_factor: getConfig(FEE_CONFIG_KEYS['tx_fees_factor'])?.value ?? undefined,
      max_sweep_fee_change: getConfig(FEE_CONFIG_KEYS['max_sweep_fee_change'])?.value ?? undefined,
    }
  }, [getConfig])

  const refetchAll = useCallback(async () => {
    setIsLoading(true)
    try {
      return await Promise.all(Object.values(FEE_CONFIG_KEYS).map(fetchConfig))
    } finally {
      setIsLoading(false)
    }
  }, [fetchConfig])

  const fetchMissing = useCallback(async () => {
    setIsLoading(true)
    try {
      return await Promise.all(Object.values(FEE_CONFIG_KEYS).map(fetchConfigIfMissing))
    } finally {
      setIsLoading(false)
    }
  }, [fetchConfigIfMissing])

  const maxFeesConfigMissing = useMemo(() => {
    // Debug: Force the error for testing
    if (forceFeeConfigMissing) {
      return true
    }

    return (
      feeConfigValues && (feeConfigValues.max_cj_fee_abs === undefined || feeConfigValues.max_cj_fee_rel === undefined)
    )
  }, [feeConfigValues, forceFeeConfigMissing])

  return {
    feeConfigValues,
    maxFeesConfigMissing,
    refetchAll,
    fetchMissing,
    isLoading,
  }
}
