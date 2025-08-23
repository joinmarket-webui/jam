import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { configgetOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { authStore } from '@/store/authStore'

export interface FeeConfigValues {
  max_cj_fee_abs?: string
  max_cj_fee_rel?: string
  tx_fees?: string
  tx_fees_factor?: string
  max_sweep_fee_change?: string
}

export const useFeeConfigValidation = () => {
  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)
  const walletFileName = authState?.walletFileName

  // Debug flag to force fee config missing error for testing
  const forceFeeConfigMissing = import.meta.env.DEV && import.meta.env.VITE_FORCE_FEE_CONFIG_MISSING === 'true'

  const commonQueryOptions = {
    enabled: !!walletFileName,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  }

  const createConfigQuery = (configKey: keyof typeof FEE_CONFIG_KEYS) => ({
    ...configgetOptions({
      client,
      path: { walletname: walletFileName || '' },
      body: FEE_CONFIG_KEYS[configKey],
    }),
    ...commonQueryOptions,
  })

  const maxCjFeeAbsQuery = useQuery(createConfigQuery('max_cj_fee_abs'))
  const maxCjFeeRelQuery = useQuery(createConfigQuery('max_cj_fee_rel'))
  const txFeesQuery = useQuery(createConfigQuery('tx_fees'))
  const txFeesFactorQuery = useQuery(createConfigQuery('tx_fees_factor'))
  const maxSweepFeeChangeQuery = useQuery(createConfigQuery('max_sweep_fee_change'))

  const feeConfigValues = useMemo<FeeConfigValues | undefined>(() => {
    if (
      !maxCjFeeAbsQuery.data &&
      !maxCjFeeRelQuery.data &&
      !txFeesQuery.data &&
      !txFeesFactorQuery.data &&
      !maxSweepFeeChangeQuery.data
    ) {
      return undefined
    }

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

  const maxFeesConfigMissing = useMemo(() => {
    // Debug: Force the error for testing
    if (forceFeeConfigMissing) {
      return true
    }

    return (
      feeConfigValues && (feeConfigValues.max_cj_fee_abs === undefined || feeConfigValues.max_cj_fee_rel === undefined)
    )
  }, [feeConfigValues, forceFeeConfigMissing])

  const isLoading = useMemo(() => {
    return (
      maxCjFeeAbsQuery.isLoading ||
      maxCjFeeRelQuery.isLoading ||
      txFeesQuery.isLoading ||
      txFeesFactorQuery.isLoading ||
      maxSweepFeeChangeQuery.isLoading
    )
  }, [
    maxCjFeeAbsQuery.isLoading,
    maxCjFeeRelQuery.isLoading,
    txFeesQuery.isLoading,
    txFeesFactorQuery.isLoading,
    maxSweepFeeChangeQuery.isLoading,
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

  const refetchAll = () => {
    maxCjFeeAbsQuery.refetch()
    maxCjFeeRelQuery.refetch()
    txFeesQuery.refetch()
    txFeesFactorQuery.refetch()
    maxSweepFeeChangeQuery.refetch()
  }

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
