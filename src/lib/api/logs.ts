export interface AuthApiRequestContext {
  token: string
  signal?: AbortSignal
}

export class LogsApiError extends Error {
  status?: number
  code?: 'not_supported' | 'request_failed'

  constructor(
    message: string,
    options: {
      status?: number
      code?: 'not_supported' | 'request_failed'
    } = {},
  ) {
    super(message)
    this.name = 'LogsApiError'
    this.status = options.status
    this.code = options.code
  }
}

const buildAuthHeader = (token: string) => {
  return { 'x-jm-authorization': `Bearer ${token}` }
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

const LOG_ENDPOINT_PATHS = ['/api/v0/log', '/jam/api/v0/log'] as const
const LOG_FALLBACK_STATUSES = new Set([404, 405, 501])

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
  let fallbackError: LogsApiError | undefined

  for (const path of LOG_ENDPOINT_PATHS) {
    const response = await fetch(`${path}/${encodedFileName}`, {
      headers: { ...buildAuthHeader(token) },
      signal,
    })

    if (response.ok) {
      const contentType = response.headers.get('content-type')?.toLowerCase() || ''
      const body = await response.text()
      const bodyStart = body.trimStart().slice(0, 64).toLowerCase()
      const isHtmlResponse =
        contentType.includes('text/html') || bodyStart.startsWith('<!doctype html') || bodyStart.startsWith('<html')

      if (isHtmlResponse) {
        fallbackError = new LogsApiError('Unexpected HTML response while fetching logs.', {
          status: response.status,
          code: 'not_supported',
        })
        continue
      }

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }

    const requestError = new LogsApiError(`Request failed with status ${response.status}`, {
      status: response.status,
      code: LOG_FALLBACK_STATUSES.has(response.status) ? 'not_supported' : 'request_failed',
    })
    if (LOG_FALLBACK_STATUSES.has(response.status)) {
      fallbackError = requestError
      continue
    }

    throw requestError
  }

  throw fallbackError ?? new LogsApiError('Failed to load log file.', { code: 'request_failed' })
}
