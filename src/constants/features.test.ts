import { describe, expect, it } from 'vitest'
import { parseSemanticVersion } from '@/lib/utils'
import { isFeatureEnabled } from './features'

describe('isFeatureEnabled', () => {
  it('keeps txFeeOnSend disabled for 0.9.10 and enables it for 0.9.11', () => {
    expect(isFeatureEnabled('txFeeOnSend', parseSemanticVersion('0.9.10'))).toBe(false)
    expect(isFeatureEnabled('txFeeOnSend', parseSemanticVersion('0.9.11'))).toBe(true)
    expect(isFeatureEnabled('txFeeOnSend', '0.9.11')).toBe(true)
    expect(isFeatureEnabled('txFeeOnSend', '0.9.12')).toBe(true)
  })
})
