import { ServiceInfo } from '../context/ServiceInfoContext'

interface Features {
  importWallet: SemVer
}

const features: Features = {
  importWallet: { major: 0, minor: 9, patch: 10 },
}

type Feature = keyof Features

const __isFeatureEnabled = (name: Feature, version: SemVer): boolean => {
  const target = features[name]
  return (
    version.major > target.major ||
    (version.major === target.major && version.minor > target.minor) ||
    (version.major === target.major && version.minor === target.minor && version.patch >= target.patch)
  )
}

export const isFeatureEnabled = (name: Feature, serviceInfo: ServiceInfo): boolean => {
  return !!serviceInfo.server?.version && __isFeatureEnabled(name, serviceInfo.server.version)
}
