import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { authStore } from '@/store/authStore'
import { buildAuthHeader, buildAuthHeaderMap, createApiClient, unauthorizedResponseInterceptor } from './config'
import { queryClient } from './queryClient'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  errorUse: vi.fn(),
  isDevMode: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/constants/debugFeatures', () => ({
  isDevMode: mocks.isDevMode,
}))

const createMockClient = () => ({
  interceptors: {
    request: { use: mocks.requestUse },
    response: { use: mocks.responseUse },
    error: { use: mocks.errorUse },
  },
})

describe('auth header helpers', () => {
  it('should build tuple and map authorization headers', () => {
    expect(buildAuthHeader('token-123')).toEqual(['x-jm-authorization', 'Bearer token-123'])
    expect(buildAuthHeaderMap('token-123')).toEqual({ 'x-jm-authorization': 'Bearer token-123' })
  })
})

describe('createApiClient', () => {
  beforeEach(() => {
    mocks.createClient.mockReturnValue(createMockClient())
    mocks.requestUse.mockReset()
    mocks.responseUse.mockReset()
    mocks.errorUse.mockReset()
    mocks.isDevMode.mockReturnValue(false)
    authStore.getState().clear()
  })

  it('should configure client middleware and interceptors', () => {
    const client = createApiClient()

    expect(client).toBe(mocks.createClient.mock.results[0].value)
    expect(mocks.createClient).toHaveBeenCalledWith({ baseUrl: String(import.meta.env.VITE_JM_API_BASE_URL) })
    expect(mocks.requestUse).toHaveBeenCalledTimes(1)
    expect(mocks.responseUse).toHaveBeenCalledWith(unauthorizedResponseInterceptor)
    expect(mocks.errorUse).toHaveBeenCalledTimes(1)
  })

  it('should attach wallet auth token to outgoing requests', () => {
    createApiClient()
    authStore.getState().update({
      walletFileName: 'test.jmdat',
      auth: { token: 'tok', refresh_token: 'ref' },
    })

    const request = new Request('https://example.test')
    const authMiddleware = mocks.requestUse.mock.calls[0][0] as (request: Request) => Request

    expect(authMiddleware(request)).toBe(request)
    expect(request.headers.get('x-jm-authorization')).toBe('Bearer tok')
  })

  it('should leave requests unchanged when no auth token exists', () => {
    createApiClient()

    const request = new Request('https://example.test')
    const authMiddleware = mocks.requestUse.mock.calls[0][0] as (request: Request) => Request

    expect(authMiddleware(request)).toBe(request)
    expect(request.headers.has('x-jm-authorization')).toBe(false)
  })

  it('should register logging interceptors in dev mode', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    mocks.isDevMode.mockReturnValue(true)

    createApiClient()
    debug.mockClear()

    expect(mocks.requestUse).toHaveBeenCalledTimes(2)
    expect(mocks.responseUse).toHaveBeenCalledTimes(2)

    const request = new Request('https://example.test')
    const response = new Response(null, { status: 204 })
    expect((mocks.requestUse.mock.calls[1][0] as (request: Request) => Request)(request)).toBe(request)
    expect((mocks.responseUse.mock.calls[1][0] as (response: Response) => Response)(response)).toBe(response)
    expect(debug).toHaveBeenCalledTimes(2)

    debug.mockRestore()
  })

  it('should normalize intercepted errors', () => {
    createApiClient()

    const normalizeError = mocks.errorUse.mock.calls[0][0] as (error: unknown) => { message: string }

    expect(normalizeError(new Error('boom')).message).toBe('boom')
  })
})

describe('unauthorizedResponseInterceptor', () => {
  let queryClientClearSpy: MockInstance<typeof queryClient.clear>

  beforeEach(() => {
    queryClientClearSpy = vi.spyOn(queryClient, 'clear')
    mocks.createClient.mockReturnValue(createMockClient())
    mocks.requestUse.mockReset()
    mocks.responseUse.mockReset()
    mocks.errorUse.mockReset()
    mocks.isDevMode.mockReturnValue(false)
    authStore.getState().update({
      walletFileName: 'test.jmdat',
      auth: { token: 'tok', refresh_token: 'ref' },
    })
    queryClientClearSpy.mockReset()
  })

  afterEach(() => {
    queryClientClearSpy.mockRestore()
  })

  it('should clear auth on invalid-token 401', () => {
    expect(authStore.getState().state?.auth?.token).toBe('tok')
    expect(queryClientClearSpy).toBeCalledTimes(0)

    unauthorizedResponseInterceptor(
      new Response(null, {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer, error="invalid_token", error_description="Invalid token."' },
      }),
    )

    expect(authStore.getState().state).toBeUndefined()
    expect(queryClientClearSpy).toBeCalledTimes(1)
  })
  it('should return the response after clearing', () => {
    const response = new Response(null, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer, error="invalid_token", error_description="Invalid token."' },
    })
    const result = unauthorizedResponseInterceptor(response)
    expect(result).toBe(response)
  })

  it('should not clear auth on non-auth 401 responses', () => {
    unauthorizedResponseInterceptor(new Response(null, { status: 401 }))
    unauthorizedResponseInterceptor(
      new Response(null, {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer, error="service_state", error_description="Not running."' },
      }),
    )
    expect(authStore.getState().state?.auth?.token).toBe('tok')
  })

  it('should not clear auth on non-401 responses', () => {
    unauthorizedResponseInterceptor(new Response(null, { status: 200 }))
    unauthorizedResponseInterceptor(new Response(null, { status: 403 }))
    unauthorizedResponseInterceptor(new Response(null, { status: 500 }))

    expect(authStore.getState().state?.auth?.token).toBe('tok')
  })
})
