import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authStore } from '@/store/authStore'
import { unauthorizedResponseInterceptor } from './config'

vi.mock('@joinmarket-webui/joinmarket-api-ts', () => ({
  createClient: vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
      error: { use: vi.fn() },
    },
  })),
}))

describe('unauthorizedResponseInterceptor', () => {
  beforeEach(() => {
    authStore.getState().update({
      walletFileName: 'test.jmdat',
      auth: { token: 'tok', refresh_token: 'ref' },
    })
  })

  it('should clear auth on 401', () => {
    expect(authStore.getState().state?.auth?.token).toBe('tok')

    unauthorizedResponseInterceptor(new Response(null, { status: 401 }))

    expect(authStore.getState().state).toBeUndefined()
  })

  it('should return the response after clearing', () => {
    const response = new Response(null, { status: 401 })
    const result = unauthorizedResponseInterceptor(response)
    expect(result).toBe(response)
  })

  it('should not clear auth on non-401 responses', () => {
    unauthorizedResponseInterceptor(new Response(null, { status: 200 }))
    unauthorizedResponseInterceptor(new Response(null, { status: 403 }))
    unauthorizedResponseInterceptor(new Response(null, { status: 500 }))

    expect(authStore.getState().state?.auth?.token).toBe('tok')
  })
})
