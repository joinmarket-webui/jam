import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { fetchFeatures } from '@/lib/api/logs'
import { authStore } from '@/store/authStore'

export interface Features {
  logs?: boolean
}

export interface FeatureItem {
  name: string
  enabled: boolean
}

export const useFeatures = () => {
  const authState = useStore(authStore, (state) => state.state)

  const {
    data: features,
    error,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['features'],
    queryFn: async ({ signal }) => {
      if (authState?.auth?.token === undefined) {
        throw new Error('No authentication token available')
      }

      const response = await fetchFeatures({
        token: authState.auth.token,
        signal,
      })

      if (!response.ok) {
        throw new Error(`Features request failed with status ${response.status}`)
      }

      const data = await response.json()
      return data.features as Features
    },
    enabled: !!authState?.auth?.token,
    retry: false,
  })

  const isLogsEnabled = () => {
    if (error) {
      return import.meta.env.DEV
    }

    if (features) {
      // Old format: { features: { logs: true } }
      if (typeof features.logs === 'boolean') {
        return features.logs
      }

      // New format: { features: [{ name: 'logs', enabled: true }] }
      if (Array.isArray(features)) {
        return features.some((feature: FeatureItem) => feature.name === 'logs' && feature.enabled === true)
      }
    }
    return false
  }

  return {
    features,
    error,
    isLoading,
    isFetching,
    isLogsEnabled: isLogsEnabled(),
  }
}
