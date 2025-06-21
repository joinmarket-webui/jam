import type { Client } from '@hey-api/client-fetch'
import { createClient } from '@/lib/jm-api'
import type { ClientOptions, UnlockWalletResponse } from '@/lib/jm-api/generated/client'
import { getSession } from '@/lib/session'

type ApiToken = UnlockWalletResponse['token']

const buildAuthHeader = (token: ApiToken): [string, string] => {
  return ['x-jm-authorization', `Bearer ${token}`]
}

async function loggingRequestInterceptor(request: Request) {
  console.debug('[onRequest]', request)
  return request
}
async function loggingResponseInterceptor(response: Response) {
  console.debug('[onResponse]', response)
  return response
}

const createJamAuthenticationMiddleware = () => {
  return async (request: Request) => {
    const session = getSession()
    if (session?.auth?.token) {
      const authHeader = buildAuthHeader(session?.auth?.token)
      request.headers.set(authHeader[0], authHeader[1])
    }
    return request
  }
}

export const createApiClient = (): Client => {
  const baseUrl: string = import.meta.env.VITE_JM_API_BASE_URL
  const clientOptions: ClientOptions = { baseUrl }

  console.debug('Setting up JM API client…', clientOptions)
  const client = createClient(clientOptions)

  // TODO: store and load token from session storage with handling refresh token
  const jamAuthMiddleware = createJamAuthenticationMiddleware()
  client.interceptors.request.use(jamAuthMiddleware)

  const isDevelopment = import.meta.env.DEV

  if (isDevelopment) {
    client.interceptors.request.use(loggingRequestInterceptor)
    client.interceptors.response.use(loggingResponseInterceptor)
  }

  return client
}
