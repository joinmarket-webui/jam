import { createClient } from '@joinmarket-webui/joinmarket-api-ts'
import type { Client } from '@joinmarket-webui/joinmarket-api-ts/client'
import type { ClientOptions, UnlockWalletResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { isDevMode } from '@/constants/debugFeatures'
import { isConnectivityError } from '@/lib/connectivity'
import { normalizeAppError } from '@/lib/errorReason'
import { authStore } from '@/store/authStore'
import { connectivityStore } from '@/store/connectivityStore'

type ApiToken = UnlockWalletResponse['token']

const buildAuthHeader = (token: ApiToken): [string, string] => {
  return ['x-jm-authorization', `Bearer ${token}`]
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
  const normalized = normalizeAppError(error)
  if (isConnectivityError(normalized)) {
    connectivityStore.getState().markApiUnreachable()
  } else {
    connectivityStore.getState().markApiReachable()
  }
  return normalized
}

function markApiReachableInterceptor(response: Response) {
  connectivityStore.getState().markApiReachable()
  return response
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

export const createApiClient = (): Client => {
  const baseUrl = String(import.meta.env.VITE_JM_API_BASE_URL)
  const clientOptions: ClientOptions = { baseUrl }

  console.debug('Setting up JM API client…', clientOptions)
  const client = createClient(clientOptions)

  const jamAuthMiddleware = createJamAuthenticationMiddleware()
  client.interceptors.request.use(jamAuthMiddleware)
  client.interceptors.response.use(markApiReachableInterceptor)
  client.interceptors.error.use(normalizeErrorInterceptor)

  if (isDevMode()) {
    client.interceptors.request.use(loggingRequestInterceptor)
    client.interceptors.response.use(loggingResponseInterceptor)
  }

  return client
}
