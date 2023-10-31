interface DebugFeatures {
  insecureScheduleTesting: boolean
  allowCreatingExpiredFidelityBond: boolean
  skipWalletBackupConfirmation: boolean
  errorExamplePage: boolean
  devSetupPage: boolean
  importDummyMnemonicPhrase: boolean
  rescanChainPage: boolean
  fastThemeToggle: boolean
}

const devMode = process.env.NODE_ENV === 'development' && process.env.REACT_APP_JAM_DEV_MODE === 'true'

const debugFeatures: DebugFeatures = {
  allowCreatingExpiredFidelityBond: devMode,
  insecureScheduleTesting: devMode,
  skipWalletBackupConfirmation: devMode,
  errorExamplePage: devMode,
  devSetupPage: devMode,
  importDummyMnemonicPhrase: devMode,
  rescanChainPage: devMode,
  fastThemeToggle: devMode,
}

type DebugFeature = keyof DebugFeatures

export const isDevMode = (): boolean => devMode

export const isDebugFeatureEnabled = (name: DebugFeature): boolean => {
  return debugFeatures[name] || false
}

// only to be used in tests
export const __testSetDebugFeatureEnabled = (name: DebugFeature, enabled: boolean): boolean => {
  return (debugFeatures[name] = enabled)
}
