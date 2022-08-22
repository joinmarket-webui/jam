import { ApiToken, Helper as ApiHelper } from '../libs/JmWalletApi'

const basePath = () => `${window.JM.PUBLIC_PATH}/jam/api/v0`

interface ApiRequestContext {
  signal?: AbortSignal
}

interface AuthApiRequestContext extends ApiRequestContext {
  token: ApiToken
}

const fetchFeatures = async ({ token, signal }: AuthApiRequestContext) => {
  return await fetch(`${basePath()}/features`, {
    headers: { ...ApiHelper.buildAuthHeader(token) },
    signal,
  })
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
  })
}

export { fetchFeatures, fetchLog }
