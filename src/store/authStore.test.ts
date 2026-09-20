import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JM_API_AUTH_TOKEN_EXPIRY } from '@/constants/jm'
import { authStore, computeAuthExpiresAt } from './authStore'

describe('computeAuthExpiresAt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives an absolute deadline from `expires_in` seconds', () => {
    expect(computeAuthExpiresAt(1_800)).toBe(1_800_000)
  })

  it('falls back to the configured token lifetime when `expires_in` is missing', () => {
    expect(computeAuthExpiresAt(undefined)).toBe(JM_API_AUTH_TOKEN_EXPIRY)
  })

  it('falls back to the configured token lifetime for a non-positive or non-finite value', () => {
    expect(computeAuthExpiresAt(0)).toBe(JM_API_AUTH_TOKEN_EXPIRY)
    expect(computeAuthExpiresAt(-1)).toBe(JM_API_AUTH_TOKEN_EXPIRY)
    expect(computeAuthExpiresAt(Number.NaN)).toBe(JM_API_AUTH_TOKEN_EXPIRY)
  })
})

describe('authStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    authStore.getState().clear()
  })

  it('persists the expiry deadline alongside the tokens', () => {
    authStore.getState().update({
      auth: { token: 't', refresh_token: 'r', expiresAt: 12_345 },
    })

    expect(authStore.getState().state?.auth?.expiresAt).toBe(12_345)
  })

  it('clears the expiry deadline along with the rest of the auth state', () => {
    authStore.getState().update({
      auth: { token: 't', refresh_token: 'r', expiresAt: 12_345 },
    })
    authStore.getState().clear()

    expect(authStore.getState().state).toBeUndefined()
  })
})
