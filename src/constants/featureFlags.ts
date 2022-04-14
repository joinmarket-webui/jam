interface FeatureFlags {
  skipWalletBackupConfirmation: boolean
  cheatsheet: boolean
}

const devMode = process.env.NODE_ENV === 'development'

const featureFlags: FeatureFlags = {
  skipWalletBackupConfirmation: devMode,
  cheatsheet: devMode,
}

type FeatureFlag = keyof FeatureFlags

export const isFeatureEnabled = (name: FeatureFlag): boolean => {
  return featureFlags[name] || false
}

// only to be used in tests
export const __testSetFeatureEnabled = (name: FeatureFlag, enabled: boolean): boolean => {
  return (featureFlags[name] = enabled)
}
