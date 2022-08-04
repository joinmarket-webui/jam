interface Features {
  skipWalletBackupConfirmation: boolean
}

const devMode = process.env.NODE_ENV === 'development'

const features: Features = {
  skipWalletBackupConfirmation: devMode,
}

type Feature = keyof Features

export const isFeatureEnabled = (name: Feature): boolean => {
  return features[name] || false
}

// only to be used in tests
export const __testSetFeatureEnabled = (name: Feature, enabled: boolean): boolean => {
  return (features[name] = enabled)
}
