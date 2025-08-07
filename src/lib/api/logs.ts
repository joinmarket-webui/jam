export interface AuthApiRequestContext {
  token: string
  signal?: AbortSignal
}

const buildAuthHeader = (token: string) => {
  return { 'x-jm-authorization': `Bearer ${token}` }
}

/**
 * Validate response content type
 */
const withExpectedContentTypeOrThrow = async (response: Response, expectedContentType: string) => {
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
    headers: { ...buildAuthHeader(token) },
    signal,
  }).then((res) => withExpectedContentTypeOrThrow(res, 'application/json'))
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
  return await fetch(`/jam/api/v0/log/${fileName}`, {
    headers: { ...buildAuthHeader(token) },
    signal,
  }).then((res) => withExpectedContentTypeOrThrow(res, 'text/plain'))
}
