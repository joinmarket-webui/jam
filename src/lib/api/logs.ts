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
 * Fetch log file content from the server
 * @param token - Authentication token
 * @param signal - AbortSignal for cancelling requests
 * @param fileName - Name of the log file to fetch
 * @returns Promise<Response>
 */
export const fetchLog = async ({
  token,
  signal,
  fileName,
}: AuthApiRequestContext & {
  fileName: string
}) => {
  const encodedFileName = encodeURIComponent(fileName)
  return await fetch(`/jam/api/v0/log/${encodedFileName}`, {
    headers: { ...buildAuthHeaderMap(token) },
    signal,
  }).then((response) => withExpectedContentTypeOrThrow(response, 'text/plain'))
}
