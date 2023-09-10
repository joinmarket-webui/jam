import { ServiceInfo } from '../context/ServiceInfoContext'

interface Features {
  importWallet: SemVer
  rescanChain: SemVer
}

const features: Features = {
  importWallet: { major: 0, minor: 9, patch: 10 }, // added in https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1461
  rescanChain: { major: 0, minor: 9, patch: 10 }, // added in https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1461
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
