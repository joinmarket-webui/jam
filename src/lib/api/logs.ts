import { buildAuthHeaderMap } from '../config'

export interface AuthApiRequestContext {
  token: string
  signal?: AbortSignal
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
 * Fetch features configuration from the server
 * @param token - Authentication token
 * @param signal - AbortSignal for cancelling requests
 * @returns Promise<Response>
 */
export const fetchFeatures = async ({ token, signal }: AuthApiRequestContext) => {
  return await fetch(`/features`, {
    headers: { ...buildAuthHeaderMap(token) },
    signal,
  }).then((response) => withExpectedContentTypeOrThrow(response, 'application/json'))
}

/**
 * Fetch log content from the server.
 *
 * jm-ng exposes a single in-memory log buffer (the daemon does not write log
 * files); the ``fileName`` parameter is retained for API compatibility but
 * ignored server-side.
 * @param token - Authentication token
 * @param signal - AbortSignal for cancelling requests
 * @param fileName - Deprecated/ignored; present for reference API compat.
 * @returns Promise<Response>
 */
export const fetchLog = async ({
  token,
  signal,
  fileName: _fileName,
}: AuthApiRequestContext & {
  fileName: string
}) => {
  return await fetch(`/api/v1/logs`, {
    headers: { ...buildAuthHeaderMap(token) },
    signal,
  }).then((response) => withExpectedContentTypeOrThrow(response, 'text/plain'))
}
