import type { Client } from "@hey-api/client-fetch";
import { createClient } from "./jm-api";
import type { ClientOptions } from "./jm-api/generated/client";

type ApiToken = string

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

const createJamAuthenticationMiddleware = (apiToken: ApiToken) => {
  return async (request: Request) => {
    const authHeader = buildAuthHeader(apiToken)
    request.headers.set(authHeader[0], authHeader[1])
    return request
  }
}

export const createApiClient = (): Client => {
  const baseUrl: string = import.meta.env.VITE_JM_API_BASE_URL
  const clientOptions: ClientOptions = { baseUrl }

  console.debug('Setting up JM API client…', clientOptions)
  const client = createClient(clientOptions)

  // TODO: store and load token from session storage with handling refresh token
  const jamAuthMiddleware = createJamAuthenticationMiddleware('example')
  client.interceptors.request.use(jamAuthMiddleware)

  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {   
    client.interceptors.request.use(loggingRequestInterceptor)
    client.interceptors.response.use(loggingResponseInterceptor)
  }

  return client
}
