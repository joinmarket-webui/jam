import { ApiToken, Helper as ApiHelper } from '../libs/JmWalletApi'

const basePath = () => `${window.JM.PUBLIC_PATH}/jam/log`

const fetchJamLog = async ({
  token,
  signal,
  fileName,
}: {
  token: ApiToken
  signal?: AbortSignal
  fileName: string
}) => {
  return await fetch(`${basePath()}/${fileName}`, {
    headers: { ...ApiHelper.buildAuthHeader(token) },
    signal,
  })
}

export { fetchJamLog }
