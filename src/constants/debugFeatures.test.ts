import { afterEach, describe, expect, it } from 'vitest'
import { __testSetDebugFeatureEnabled, isDebugFeatureEnabled, isDevMode } from './debugFeatures'

describe('debugFeatures', () => {
  afterEach(() => {
    __testSetDebugFeatureEnabled('allowFeeValuesReset', isDevMode())
  })

  it('should read configured debug feature flags', () => {
    expect(isDebugFeatureEnabled('allowFeeValuesReset')).toBe(isDevMode())
  })

  it('should support test-only feature overrides', () => {
    expect(__testSetDebugFeatureEnabled('allowFeeValuesReset', true)).toBe(true)
    expect(isDebugFeatureEnabled('allowFeeValuesReset')).toBe(true)

    expect(__testSetDebugFeatureEnabled('allowFeeValuesReset', false)).toBe(false)
    expect(isDebugFeatureEnabled('allowFeeValuesReset')).toBe(false)
  })
})
