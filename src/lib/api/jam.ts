import { buildAuthHeaderMap } from '../config'

export interface AuthApiRequestContext {
  token: string
  signal?: AbortSignal
}

export type JamInfoResponse = {
  backend: {
    name: string
    version: string
  }
}

/**
 * Validate response content type
 */
const withExpectedContentTypeOrThrow = (response: Response, expectedContentType: string) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && !contentType.includes(expectedContentType)) {
    throw new Error(`Expected content type ${expectedContentType}, got ${contentType}`)
  }

  return response
}

/**
 * Fetch Jam runtime information from standalone images.
 * @param token - Authentication token
 * @param signal - AbortSignal for cancelling requests
 * @returns Promise<Response>
 */
export const fetchInfo = async ({ token, signal }: AuthApiRequestContext) => {
  return await fetch('/jam/api/v0/info', {
    headers: { ...buildAuthHeaderMap(token) },
    signal,
  }).then((response) => withExpectedContentTypeOrThrow(response, 'application/json'))
}
