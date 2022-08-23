import { ApiToken, JmApiError, Helper as ApiHelper } from '../libs/JmWalletApi'

const basePath = () => `${window.JM.PUBLIC_PATH}/jam/api/v0`

interface ApiRequestContext {
  signal?: AbortSignal
}

interface AuthApiRequestContext extends ApiRequestContext {
  token: ApiToken
}

/**
 * Some backends will deliver the index page instead of mapping "/jam/api/".
 * This is why all responses should be checked to have an expected
 * content type.
 *
 * This function will use `startsWith` instead of strict equality.
 * e.g. So if you expect `application/json` it will still match
 * `application/json; charset=utf-8`.
 *
 * @param res the response to check the content type of
 * @param expectedContentType the expected content type
 * @returns the response having the expected content type, otherwise throws
 * @throws JmApiError if the response has a different Content-Type
 */
const withExpectedContentTypeOrThrow = (res: Response, expectedContentType: string) => {
  const contentType = res.headers.get('Content-Type')
  if (res.ok && (contentType === null || !contentType.startsWith(expectedContentType))) {
    throw new JmApiError('Unexpected Content-Type', res)
  }
  return res
}

const fetchFeatures = async ({ token, signal }: AuthApiRequestContext) => {
  return await fetch(`${basePath()}/features`, {
    headers: { ...ApiHelper.buildAuthHeader(token) },
    signal,
  }).then((res) => withExpectedContentTypeOrThrow(res, 'application/json'))
}

const fetchLog = async ({
  token,
  signal,
  fileName,
}: AuthApiRequestContext & {
  fileName: string
}) => {
  return await fetch(`${basePath()}/log/${fileName}`, {
    headers: { ...ApiHelper.buildAuthHeader(token) },
    signal,
  }).then((res) => withExpectedContentTypeOrThrow(res, 'text/plain'))
}

export { fetchFeatures, fetchLog }
