import { useCallback, useMemo, useState } from 'react'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import type { FeeConfigValues } from '@/lib/feeConfig'
import type { WalletFileName } from '@/lib/utils'
import { useJmConfig } from './useJmConfig'

export type { FeeConfigValues } from '@/lib/feeConfig'
export { isMaxFeesConfigMissing } from '@/lib/feeConfig'

interface UseFeeConfigValidationProps {
  walletFileName: WalletFileName
}

export const useFeeConfigValidation = ({ walletFileName }: UseFeeConfigValidationProps) => {
  const {
    state: configState,
    refetch: refetchConfig,
    fetchIfMissing: fetchConfigIfMissing,
  } = useJmConfig({ walletFileName })
  const [isLoading, setIsLoading] = useState(false)

  // Debug flag to force fee config missing error for testing
  const forceFeeConfigMissing = import.meta.env.DEV && import.meta.env.VITE_FORCE_FEE_CONFIG_MISSING === 'true'

  const feeConfigValues = useMemo<FeeConfigValues>(() => {
    const getConfigValue = (key: keyof typeof FEE_CONFIG_KEYS) => {
      const configKey = FEE_CONFIG_KEYS[key]
      return configState[configKey.section]?.[configKey.field] ?? undefined
    }

    return {
      max_cj_fee_abs: getConfigValue('max_cj_fee_abs'),
      max_cj_fee_rel: getConfigValue('max_cj_fee_rel'),
      tx_fees: getConfigValue('tx_fees'),
      tx_fees_factor: getConfigValue('tx_fees_factor'),
      max_sweep_fee_change: getConfigValue('max_sweep_fee_change'),
    }
  }, [configState])

  const refetchAll = useCallback(async () => {
    setIsLoading(true)
    try {
      return await Promise.all(Object.values(FEE_CONFIG_KEYS).map((it) => refetchConfig(it)))
    } finally {
      setIsLoading(false)
    }
  }, [refetchConfig])

  const fetchMissing = useCallback(async () => {
    setIsLoading(true)
    try {
      return await Promise.all(Object.values(FEE_CONFIG_KEYS).map((it) => fetchConfigIfMissing(it)))
    } finally {
      setIsLoading(false)
    }
  }, [fetchConfigIfMissing])

  const maxFeesConfigMissing = useMemo(() => {
    // Debug: Force the error for testing
    if (forceFeeConfigMissing) {
      return true
    }

    return feeConfigValues.max_cj_fee_abs === undefined || feeConfigValues.max_cj_fee_rel === undefined
  }, [feeConfigValues, forceFeeConfigMissing])

  return {
    feeConfigValues,
    maxFeesConfigMissing,
    refetchAll,
    fetchMissing,
    isLoading,
  }
}
