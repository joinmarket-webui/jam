interface DebugFeatures {
  developerMode: boolean
  insecureScheduleTesting: boolean
  allowCreatingExpiredFidelityBond: boolean
  skipWalletBackupConfirmation: boolean
  devErrorExamplePage: boolean
  devPage: boolean
  devSetupPage: boolean
  importDummyMnemonicPhrase: boolean
  allowFeeValuesReset: boolean
  enableDemoEarnReport: boolean
  enableDemoOrderbook: boolean
}

const devMode = import.meta.env.DEV && import.meta.env.VITE_JAM_DEV_MODE === 'true'

const debugFeatures: DebugFeatures = {
  developerMode: devMode,
  allowCreatingExpiredFidelityBond: devMode,
  insecureScheduleTesting: devMode,
  skipWalletBackupConfirmation: devMode,
  devErrorExamplePage: devMode,
  devPage: devMode,
  devSetupPage: devMode,
  importDummyMnemonicPhrase: devMode,
  allowFeeValuesReset: devMode,
  enableDemoEarnReport: devMode,
  enableDemoOrderbook: devMode,
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
