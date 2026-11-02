import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { createApiClient } from './config'
import { queryClient } from './queryClient'

vi.mock('@/constants/debugFeatures', () => ({ isDevMode: () => false }))

const invalidTokenResponse = () =>
  new Response(null, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Bearer, error="invalid_token", error_description="Invalid token."' },
  })

const authenticate = (walletFileName: WalletFileName, token: string) => {
  authStore.getState().update({
    walletFileName,
    auth: { token, refresh_token: `refresh-${token}`, expiresAt: Date.now() + 1_800_000 },
  })
}

const startRequest = async () => {
  let respond!: (response: Response) => void
  const response = new Promise<Response>((resolve) => {
    respond = resolve
  })
  const fetchMock = vi.fn<typeof fetch>().mockReturnValue(response)
  const client = createApiClient()
  client.setConfig({ baseUrl: 'https://example.test', fetch: fetchMock })

  const pending = client.get({ url: '/api/v1/session' })
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  const request = fetchMock.mock.calls[0][0] as Request

  return { pending, respond, request }
}

describe('API authentication response races', () => {
  beforeEach(() => {
    authStore.getState().clear()
    queryClient.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    authStore.getState().clear()
    queryClient.clear()
  })

  it.each([
    ['a newer login', 'new-wallet.jmdat'],
    ['a refreshed token', 'old-wallet.jmdat'],
  ] as const)(
    'preserves %s and its cache when an older request returns invalid_token',
    async (_description, walletFileName) => {
      authenticate('old-wallet.jmdat', 'old-token')
      const { pending, respond, request } = await startRequest()
      expect(request.headers.get('x-jm-authorization')).toBe('Bearer old-token')

      authenticate(walletFileName, 'new-token')
      const currentState = authStore.getState().state
      queryClient.setQueryData(['current-wallet'], { walletFileName })
      const clearCache = vi.spyOn(queryClient, 'clear')

      const response = invalidTokenResponse()
      respond(response)
      const result = await pending

      expect(result.response).toBe(response)
      expect(result.error).toBeDefined()
      expect(authStore.getState().state).toEqual(currentState)
      expect(queryClient.getQueryData(['current-wallet'])).toEqual({ walletFileName })
      expect(clearCache).not.toHaveBeenCalled()
    },
  )

  it('preserves a new login when an unauthenticated request returns invalid_token', async () => {
    const { pending, respond, request } = await startRequest()
    expect(request.headers.has('x-jm-authorization')).toBe(false)

    authenticate('new-wallet.jmdat', 'new-token')
    const currentState = authStore.getState().state
    queryClient.setQueryData(['current-wallet'], 'new-wallet-data')
    const clearCache = vi.spyOn(queryClient, 'clear')

    respond(invalidTokenResponse())
    await pending

    expect(authStore.getState().state).toEqual(currentState)
    expect(queryClient.getQueryData(['current-wallet'])).toBe('new-wallet-data')
    expect(clearCache).not.toHaveBeenCalled()
  })

  it('does not clear the cache again when an old request returns invalid_token after logout', async () => {
    authenticate('old-wallet.jmdat', 'old-token')
    const { pending, respond } = await startRequest()
    authStore.getState().clear()
    queryClient.clear()
    queryClient.setQueryData(['public-session'], 'logged-out-data')
    const clearCache = vi.spyOn(queryClient, 'clear')

    respond(invalidTokenResponse())
    await pending

    expect(authStore.getState().state).toBeUndefined()
    expect(queryClient.getQueryData(['public-session'])).toBe('logged-out-data')
    expect(clearCache).not.toHaveBeenCalled()
  })

  it('clears auth and cache when the current request returns invalid_token', async () => {
    authenticate('current-wallet.jmdat', 'current-token')
    queryClient.setQueryData(['current-wallet'], 'current-wallet-data')
    const { pending, respond, request } = await startRequest()
    expect(request.headers.get('x-jm-authorization')).toBe('Bearer current-token')
    const clearCache = vi.spyOn(queryClient, 'clear')

    const response = invalidTokenResponse()
    respond(response)
    const result = await pending

    expect(result.response).toBe(response)
    expect(result.error).toBeDefined()
    expect(authStore.getState().state).toBeUndefined()
    expect(queryClient.getQueryData(['current-wallet'])).toBeUndefined()
    expect(clearCache).toHaveBeenCalledOnce()
  })
})
