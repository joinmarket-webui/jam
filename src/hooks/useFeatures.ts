import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { fetchFeatures } from '@/lib/api/logs'
import { authStore } from '@/store/authStore'
import { useDeveloperMode } from '@/store/jamSettingsStore'

type SupportedFeature = 'logs' // add on demand

type FeatureItem = {
  name: string
  enabled: boolean
}

type FeaturesApiResponse = {
  features: Record<string, boolean> | FeatureItem[]
}

export const useFeatures = () => {
  const { enabled: isDeveloperMode } = useDeveloperMode()
  const token = useStore(authStore, (state) => state.state?.auth?.token)

  const {
    data: features,
    error,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['features'],
    queryFn: async ({ signal }) => {
      if (token === undefined) {
        throw new Error('No authentication token available')
      }

      const response = await fetchFeatures({
        token,
        signal,
      })

      if (!response.ok) {
        throw new Error(`Features request failed with status ${response.status}`)
      }

      return (await response.json()) as FeaturesApiResponse
    },
    enabled: token !== undefined,
    retry: false,
    select: (data: FeaturesApiResponse): FeatureItem[] => {
      if (!data.features) {
        return []
      }
      // New format: { features: [{ name: 'logs', enabled: true }] }
      else if (Array.isArray(data.features)) {
        return data.features
      }
      // Old format: { features: { logs: true } }
      else if (typeof data.features === 'object') {
        return Object.entries(data.features).map(([name, enabled]) => ({ name, enabled }))
      } else {
        console.warn('Could not parse feature response. Disabling all optional features.')
        return []
      }
    },
  })

  const isFeatureSupported = (featureName: SupportedFeature) => {
    return features?.some((feature) => feature.name === featureName && feature.enabled === true)
  }
  const isFeatureEnabled = (featureName: SupportedFeature) => {
    return isFeatureSupported(featureName) || isDeveloperMode
  }

  return {
    features,
    error,
    isLoading,
    isFetching,
    isFeatureSupported: isFeatureSupported,
    isFeatureEnabled: isFeatureEnabled,
  }
}
