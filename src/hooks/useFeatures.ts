import { useQuery } from '@tanstack/react-query'
import { fetchFeatures } from '@/lib/api/logs'
import { useSession } from './useSession'

export interface Features {
  logs?: boolean
}

export interface FeatureItem {
  name: string
  enabled: boolean
}

export const useFeatures = () => {
  const session = useSession()

  const {
    data: features,
    error,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['features'],
    queryFn: async ({ signal }) => {
      if (!session?.auth?.token) {
        throw new Error('No authentication token available')
      }

      const response = await fetchFeatures({
        token: session.auth.token,
        signal,
      })

      if (!response.ok) {
        throw new Error(`Features request failed with status ${response.status}`)
      }

      const data = await response.json()
      return data.features as Features
    },
    enabled: !!session?.auth?.token,
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
