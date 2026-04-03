import { isFeatureEnabled } from './features'

describe('isFeatureEnabled', () => {
  it('respects the txFeeOnSend version boundary', () => {
    expect(
      isFeatureEnabled('txFeeOnSend', {
        server: {
          version: { major: 0, minor: 9, patch: 10 },
        },
      } as any),
    ).toBe(false)

    expect(
      isFeatureEnabled('txFeeOnSend', {
        server: {
          version: { major: 0, minor: 9, patch: 11 },
        },
      } as any),
    ).toBe(true)
  })

  it('returns false when the service has no server info', () => {
    expect(isFeatureEnabled('importWallet', {} as any)).toBe(false)
  })
})
