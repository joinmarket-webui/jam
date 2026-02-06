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

const developmentMode = import.meta.env.DEV && import.meta.env.VITE_JAM_DEV_MODE === 'true'

const debugFeatures: DebugFeatures = {
  developerMode: developmentMode,
  allowCreatingExpiredFidelityBond: developmentMode,
  insecureScheduleTesting: developmentMode,
  skipWalletBackupConfirmation: developmentMode,
  devErrorExamplePage: developmentMode,
  devPage: developmentMode,
  devSetupPage: developmentMode,
  importDummyMnemonicPhrase: developmentMode,
  allowFeeValuesReset: developmentMode,
  enableDemoEarnReport: developmentMode,
  enableDemoOrderbook: developmentMode,
}

type DebugFeature = keyof DebugFeatures

export const isDevMode = (): boolean => developmentMode

export const isDebugFeatureEnabled = (name: DebugFeature): boolean => {
  return debugFeatures[name] || false
}

// only to be used in tests
export const __testSetDebugFeatureEnabled = (name: DebugFeature, enabled: boolean): boolean => {
  return (debugFeatures[name] = enabled)
}
