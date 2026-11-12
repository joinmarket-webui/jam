import { useMemo } from 'react'
import { useQueryJmInfo } from '@/hooks/useQueryJmInfo'
import { useDeveloperMode } from '@/store/jamSettingsStore'

type SupportedFeature = 'logs' // add on demand

type FeatureItem = {
  name: SupportedFeature
  enabled: boolean
}

// joinmarket-ng serves its recent log output via `GET /api/v1/logs`.
// see https://github.com/joinmarket-ng/joinmarket-ng/blob/0.43.0/jmwalletd/src/jmwalletd/routers/logs.py
const BACKEND_JOINMARKET_NG = 'joinmarket-ng'

export const useFeatures = () => {
  const { enabled: isDeveloperMode } = useDeveloperMode()
  const { info } = useQueryJmInfo()

  const features = useMemo<FeatureItem[] | undefined>(() => {
    if (info === undefined) return undefined
    return [{ name: 'logs', enabled: info.backend === BACKEND_JOINMARKET_NG }]
  }, [info])

  const isFeatureSupported = (featureName: SupportedFeature) => {
    return features?.some((feature) => feature.name === featureName && feature.enabled === true) === true
  }
  const isFeatureEnabled = (featureName: SupportedFeature) => {
    return isFeatureSupported(featureName) || isDeveloperMode
  }

  return {
    features,
    isFeatureSupported: isFeatureSupported,
    isFeatureEnabled: isFeatureEnabled,
  }
}
