import { useCallback, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { configgetMutation } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import type { WalletFileName } from '@/lib/utils'

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
  const client = useApiClient()

  // Debug flag to force fee config missing error for testing
  const forceFeeConfigMissing = import.meta.env.DEV && import.meta.env.VITE_FORCE_FEE_CONFIG_MISSING === 'true'

  const createConfigQuery = (configKey: keyof typeof FEE_CONFIG_KEYS) => ({
    ...configgetMutation({
      client,
      path: { walletname: walletFileName },
      body: FEE_CONFIG_KEYS[configKey],
    }),
  })

  const { mutateAsync: fetchMaxCjFeeAbs, ...maxCjFeeAbsQuery } = useMutation(createConfigQuery('max_cj_fee_abs'))
  const { mutateAsync: fetchMaxCjFeeRel, ...maxCjFeeRelQuery } = useMutation(createConfigQuery('max_cj_fee_rel'))
  const { mutateAsync: fetchTxFees, ...txFeesQuery } = useMutation(createConfigQuery('tx_fees'))
  const { mutateAsync: fetchTxFeesFactor, ...txFeesFactorQuery } = useMutation(createConfigQuery('tx_fees_factor'))
  const { mutateAsync: fetchMaxSweepFeeChange, ...maxSweepFeeChangeQuery } = useMutation(
    createConfigQuery('max_sweep_fee_change'),
  )

  const feeConfigValues = useMemo<FeeConfigValues | undefined>(() => {
    return {
      max_cj_fee_abs: maxCjFeeAbsQuery.data?.configvalue,
      max_cj_fee_rel: maxCjFeeRelQuery.data?.configvalue,
      tx_fees: txFeesQuery.data?.configvalue,
      tx_fees_factor: txFeesFactorQuery.data?.configvalue,
      max_sweep_fee_change: maxSweepFeeChangeQuery.data?.configvalue,
    }
  }, [
    maxCjFeeAbsQuery.data,
    maxCjFeeRelQuery.data,
    txFeesQuery.data,
    txFeesFactorQuery.data,
    maxSweepFeeChangeQuery.data,
  ])

  const isLoading = useMemo(() => {
    return (
      maxCjFeeAbsQuery.isPending ||
      maxCjFeeRelQuery.isPending ||
      txFeesQuery.isPending ||
      txFeesFactorQuery.isPending ||
      maxSweepFeeChangeQuery.isPending
    )
  }, [
    maxCjFeeAbsQuery.isPending,
    maxCjFeeRelQuery.isPending,
    txFeesQuery.isPending,
    txFeesFactorQuery.isPending,
    maxSweepFeeChangeQuery.isPending,
  ])

  const error = useMemo(() => {
    return (
      maxCjFeeAbsQuery.error ||
      maxCjFeeRelQuery.error ||
      txFeesQuery.error ||
      txFeesFactorQuery.error ||
      maxSweepFeeChangeQuery.error
    )
  }, [
    maxCjFeeAbsQuery.error,
    maxCjFeeRelQuery.error,
    txFeesQuery.error,
    txFeesFactorQuery.error,
    maxSweepFeeChangeQuery.error,
  ])

  const refetchAll = useCallback(async () => {
    const args = {
      path: { walletname: walletFileName },
    }
    return await Promise.all([
      fetchMaxCjFeeAbs(args),
      fetchMaxCjFeeRel(args),
      fetchTxFees(args),
      fetchTxFeesFactor(args),
      fetchMaxSweepFeeChange(args),
    ])
  }, [walletFileName, fetchMaxCjFeeAbs, fetchMaxCjFeeRel, fetchTxFees, fetchTxFeesFactor, fetchMaxSweepFeeChange])

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
    isLoading,
    error,
    refetchAll,
    queries: {
      maxCjFeeAbsQuery,
      maxCjFeeRelQuery,
      txFeesQuery,
      txFeesFactorQuery,
      maxSweepFeeChangeQuery,
    },
  }
}
