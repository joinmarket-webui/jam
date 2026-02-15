import { useCallback, useMemo, useState } from 'react'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { isMaxFeesConfigMissing, type FeeConfigValues } from '@/lib/feeConfig'
import type { WalletFileName } from '@/lib/utils'
import { useJmConfig } from './useJmConfig'

export type { FeeConfigValues } from '@/lib/feeConfig'
export { isMaxFeesConfigMissing } from '@/lib/feeConfig'

interface UseFeeConfigValidationProps {
  walletFileName: WalletFileName
}

export const useFeeConfigValidation = ({ walletFileName }: UseFeeConfigValidationProps) => {
  const {
    get: getConfig,
    refetch: refetchConfig,
    fetchIfMissing: fetchConfigIfMissing,
  } = useJmConfig({ walletFileName })
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

    return isMaxFeesConfigMissing(feeConfigValues)
  }, [feeConfigValues, forceFeeConfigMissing])

  return {
    feeConfigValues,
    maxFeesConfigMissing,
    refetchAll,
    fetchMissing,
    isLoading,
  }
}
