import { isFeatureEnabled } from './features'
import type { ServiceInfo } from '../context/ServiceInfoContext'

const makeServiceInfo = (version: SemVer): ServiceInfo =>
  ({
    sessionActive: false,
    makerRunning: false,
    coinjoinInProgress: false,
    rescanning: false,
    walletFileName: null,
    schedule: null,
    offers: null,
    nickname: null,
    server: { version },
  }) as ServiceInfo

describe('isFeatureEnabled — txFeeOnSend (requires >= 0.9.11)', () => {
  it('returns false for version 0.9.10', () => {
    expect(isFeatureEnabled('txFeeOnSend', makeServiceInfo({ major: 0, minor: 9, patch: 10 }))).toBe(false)
  })

  it('returns true for version 0.9.11 (exact minimum)', () => {
    expect(isFeatureEnabled('txFeeOnSend', makeServiceInfo({ major: 0, minor: 9, patch: 11 }))).toBe(true)
  })

  it('returns true for version 0.9.12', () => {
    expect(isFeatureEnabled('txFeeOnSend', makeServiceInfo({ major: 0, minor: 9, patch: 12 }))).toBe(true)
  })

  it('returns true for version 1.0.0', () => {
    expect(isFeatureEnabled('txFeeOnSend', makeServiceInfo({ major: 1, minor: 0, patch: 0 }))).toBe(true)
  })

  it('returns false when server is undefined', () => {
    const info: ServiceInfo = makeServiceInfo({ major: 1, minor: 0, patch: 0 })
    delete (info as any).server
    expect(isFeatureEnabled('txFeeOnSend', info)).toBe(false)
  })
})

describe('isFeatureEnabled — importWallet (requires >= 0.9.10)', () => {
  it('returns false for version 0.9.9', () => {
    expect(isFeatureEnabled('importWallet', makeServiceInfo({ major: 0, minor: 9, patch: 9 }))).toBe(false)
  })

  it('returns true for version 0.9.10', () => {
    expect(isFeatureEnabled('importWallet', makeServiceInfo({ major: 0, minor: 9, patch: 10 }))).toBe(true)
  })
})
