import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authStore } from '@/store/authStore'
import { unauthorizedResponseInterceptor } from './config'
import { queryClient } from './queryClient'

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
  const queryClientClearSpy = vi.spyOn(queryClient, 'clear')

  beforeEach(() => {
    authStore.getState().update({
      walletFileName: 'test.jmdat',
      auth: { token: 'tok', refresh_token: 'ref' },
    })
    queryClientClearSpy.mockReset()
  })

  it('should clear auth and query cache on 401 if authenticated', () => {
    expect(authStore.getState().state?.auth?.token).toBe('tok')
    expect(queryClientClearSpy).toBeCalledTimes(0)

    unauthorizedResponseInterceptor(new Response(null, { status: 401 }))

    expect(authStore.getState().state).toBeUndefined()
    expect(queryClientClearSpy).toBeCalledTimes(1)
  })

  it('should not clear query cache on 401 if not authenticated', () => {
    authStore.getState().clear()

    expect(authStore.getState().state?.auth).toBeUndefined()
    expect(queryClientClearSpy).toBeCalledTimes(0)

    unauthorizedResponseInterceptor(new Response(null, { status: 401 }))

    expect(queryClientClearSpy).toBeCalledTimes(0)
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
