import { parseSemanticVersion, type SemanticVersion } from '@/lib/utils'

export type FeatureName = 'txFeeOnSend'

type VersionInput = SemanticVersion | string

const FEATURE_MIN_VERSION: Record<FeatureName, SemanticVersion> = {
  txFeeOnSend: { major: 0, minor: 9, patch: 11 },
}

const compareSemanticVersions = (lhs: SemanticVersion, rhs: SemanticVersion): number => {
  if (lhs.major !== rhs.major) {
    return lhs.major - rhs.major
  }

  if (lhs.minor !== rhs.minor) {
    return lhs.minor - rhs.minor
  }

  return lhs.patch - rhs.patch
}

const normalizeVersion = (version: VersionInput): SemanticVersion => {
  if (typeof version === 'string') {
    return parseSemanticVersion(version)
  }

  return version
}

export const isFeatureEnabled = (featureName: FeatureName, version: VersionInput): boolean => {
  const resolvedVersion = normalizeVersion(version)
  return compareSemanticVersions(resolvedVersion, FEATURE_MIN_VERSION[featureName]) >= 0
}
