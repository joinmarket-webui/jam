import { createClient } from '@joinmarket-ng/joinmarket-ng-api-ts'
import type { Client } from '@joinmarket-ng/joinmarket-ng-api-ts/client'
import type { ClientOptions, UnlockWalletResponse } from '@joinmarket-ng/joinmarket-ng-api-ts/jm'
import { isDevMode } from '@/constants/debugFeatures'
import { normalizeAppError } from '@/lib/errorReason'
import { authStore } from '@/store/authStore'
import { queryClient } from './queryClient'

export type ApiToken = UnlockWalletResponse['token']

export const buildAuthHeader = (token: ApiToken): [string, string] => {
  return ['x-jm-authorization', `Bearer ${token}`]
}

export const buildAuthHeaderMap = (token: ApiToken) => {
  return { 'x-jm-authorization': `Bearer ${token}` }
}

function loggingRequestInterceptor(request: Request) {
  console.debug('[onRequest]', request)
  return request
}
function loggingResponseInterceptor(response: Response) {
  console.debug('[onResponse]', response)
  return response
}

function normalizeErrorInterceptor(error: unknown) {
  return normalizeAppError(error)
}

const createJamAuthenticationMiddleware = () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- false positive
  return (request: Request) => {
    const authState = authStore.getState().state
    if (authState?.auth?.token) {
      const authHeader = buildAuthHeader(authState.auth.token)
      request.headers.set(authHeader[0], authHeader[1])
    }
    return request
  }
}

export function unauthorizedResponseInterceptor(response: Response) {
  const wwwAuthenticate = response.headers.get('WWW-Authenticate')
  const isInvalidToken =
    response.status === 401 &&
    typeof wwwAuthenticate === 'string' &&
    wwwAuthenticate.toLowerCase().includes('error="invalid_token"')

  if (isInvalidToken) {
    authStore.getState().clear()
    queryClient.clear()
  }
  return response
}

export const createApiClient = (): Client => {
  const baseUrl = String(import.meta.env.VITE_JM_API_BASE_URL)
  const clientOptions: ClientOptions = { baseUrl }

  console.debug('Setting up JM API client…', clientOptions)
  const client = createClient(clientOptions)

  const jamAuthMiddleware = createJamAuthenticationMiddleware()
  client.interceptors.request.use(jamAuthMiddleware)
  client.interceptors.response.use(unauthorizedResponseInterceptor)
  client.interceptors.error.use(normalizeErrorInterceptor)

  if (isDevMode()) {
    client.interceptors.request.use(loggingRequestInterceptor)
    client.interceptors.response.use(loggingResponseInterceptor)
  }

  return client
}
