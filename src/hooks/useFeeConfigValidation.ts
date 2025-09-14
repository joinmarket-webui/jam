import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { FEE_CONFIG_KEYS } from '@/constants/jm'
import { useApiClient } from '@/hooks/useApiClient'
import { configgetMutation } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { authStore } from '@/store/authStore'

//TODO: needs testing!

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

  const createConfigQuery = (configKey: keyof typeof FEE_CONFIG_KEYS) => ({
    ...configgetMutation({
      client,
      path: { walletname: walletFileName || '' },
      body: FEE_CONFIG_KEYS[configKey],
    }),
  })

  const maxCjFeeAbsQuery = useMutation(createConfigQuery('max_cj_fee_abs'))
  const maxCjFeeRelQuery = useMutation(createConfigQuery('max_cj_fee_rel'))
  const txFeesQuery = useMutation(createConfigQuery('tx_fees'))
  const txFeesFactorQuery = useMutation(createConfigQuery('tx_fees_factor'))
  const maxSweepFeeChangeQuery = useMutation(createConfigQuery('max_sweep_fee_change'))

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

  const refetchAll = async () => {
    await maxCjFeeAbsQuery.mutateAsync({
      path: { walletname: walletFileName || '' },
    })
    await maxCjFeeRelQuery.mutateAsync({
      path: { walletname: walletFileName || '' },
    })
    await txFeesQuery.mutateAsync({
      path: { walletname: walletFileName || '' },
    })
    await txFeesFactorQuery.mutateAsync({
      path: { walletname: walletFileName || '' },
    })
    await maxSweepFeeChangeQuery.mutateAsync({
      path: { walletname: walletFileName || '' },
    })
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
