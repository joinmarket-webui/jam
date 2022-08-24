/**
 * Simple collection of api requests to jmwalletd.
 *
 * This is not aiming to be feature-complete.
 *
 * See OpenAPI spec: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/api/wallet-rpc.yaml
 *
 * Because all requests are forwarded through a proxy, additional functionality
 * can be provided. One adaptation is to send the Authorization header as
 * 'x-jm-authorization' so that any reverse proxy can apply its own
 * authentication mechanism.
 */
const basePath = () => `${window.JM.PUBLIC_PATH}/api`

export type ApiToken = string
export type WalletName = `${string}.jmdat`

export type Mixdepth = number
export type AmountSats = number // TODO: should be BigInt! Remove once every caller migrated to TypeScript.
export type BitcoinAddress = string

type Vout = number
export type TxId = string
export type UtxoId = `${TxId}:${Vout}`

type WithWalletName = {
  walletName: WalletName
}
type WithMixdepth = {
  mixdepth: Mixdepth
}

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type YYYY = `2${Digit}${Digit}${Digit}`
type MM = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'
export type Lockdate = `${YYYY}-${MM}`
type WithLockdate = {
  lockdate: Lockdate
}

interface ApiRequestContext {
  signal?: AbortSignal
}

interface AuthApiRequestContext extends ApiRequestContext {
  token: ApiToken
}

export type WalletRequestContext = AuthApiRequestContext & WithWalletName

interface ApiError {
  message: string
}

type WalletType = 'sw-fb'

interface CreateWalletRequest {
  wallettype: WalletType
  walletname: WalletName
  password: string
}

interface WalletUnlockRequest {
  password: string
}

// only support starting the maker with native segwit offers
type RelOfferType = 'sw0reloffer'
type AbsOfferType = 'sw0absoffer'
type OrderType = RelOfferType | AbsOfferType

interface StartMakerRequest {
  cjfee_a: AmountSats
  cjfee_r: number
  ordertype: OrderType
  minsize: AmountSats
}

interface DirectSendRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
}

interface DoCoinjoinRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
  counterparties: number
}

interface FreezeRequest {
  utxo: UtxoId
  freeze: boolean
}

interface ConfigSetRequest {
  section: string
  field: string
}

interface StartSchedulerRequest {
  destination_addresses: BitcoinAddress[]
  tumbler_options?: TumblerOptions
}

interface TumblerOptions {
  restart?: boolean
  schedulefile?: string
  addrcount?: number
  makercountrange?: number[]
  minmakercount?: number
  mixdepthcount?: number
  txcountparams?: number[]
  mintxcount?: number
  donateamount?: number
  timelambda?: number
  stage1_timelambda_increase?: number
  waittime?: number
  mincjamount?: number
  liquiditywait?: number
  maxbroadcasts?: number
  maxcreatetx?: number
  amtmixdepths?: number
  rounding_chance?: number
  rounding_sigfig_weights?: number[]
}

/**
 * Construct a bearer authorization header object for the given token.
 *
 * The 'x-jm-authorization' header is forwarded as 'Authorization' header in
 * requests to jmwalletd by the reverse proxy.
 *
 * @param {ApiToken} token the bearer token
 * @returns an object containing the authorization header
 */
const Authorization = (token: ApiToken) => {
  return { 'x-jm-authorization': `Bearer ${token}` }
}

const getSession = async ({ token, signal }: ApiRequestContext & { token?: ApiToken }) => {
  return await fetch(`${basePath()}/v1/session`, {
    headers: token ? { ...Authorization(token) } : undefined,
    signal,
  })
}

const getAddressNew = async ({ token, signal, walletName, mixdepth }: WalletRequestContext & WithMixdepth) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/address/new/${mixdepth}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getAddressTimelockNew = async ({ token, signal, walletName, lockdate }: WalletRequestContext & WithLockdate) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/address/timelock/new/${lockdate}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletAll = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/all`, {
    signal,
  })
}

const postWalletCreate = async (req: CreateWalletRequest) => {
  const walletname = req.walletname.endsWith('.jmdat') ? req.walletname : `${req.walletname}.jmdat`

  return await fetch(`${basePath()}/v1/wallet/create`, {
    method: 'POST',
    body: JSON.stringify({ ...req, walletname, wallettype: 'sw-fb' }),
  })
}

const getWalletDisplay = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/display`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletSeed = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/getseed`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

/**
 * Block access to a currently decrypted wallet.
 * After this (authenticated) action, the wallet will not be readable or writeable.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getWalletLock = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/lock`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const postWalletUnlock = async (
  { signal, walletName }: ApiRequestContext & WithWalletName,
  { password }: WalletUnlockRequest
) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    signal,
  })
}

const getWalletUtxos = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/utxos`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const postMakerStart = async ({ token, signal, walletName }: WalletRequestContext, req: StartMakerRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/maker/start`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      ...req,
      // We enforce type-safety for the following properties, but their values must actually be passed as string!
      cjfee_a: String(req.cjfee_a),
      cjfee_r: String(req.cjfee_r),
      minsize: String(req.minsize),
      txfee: String(0),
    }),
    signal,
  })
}

/**
 * Stop the yield generator service.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getMakerStop = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/maker/stop`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const postDirectSend = async ({ token, signal, walletName }: WalletRequestContext, req: DirectSendRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/taker/direct-send`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify(req),
    signal,
  })
}

const postCoinjoin = async ({ token, signal, walletName }: WalletRequestContext, req: DoCoinjoinRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/taker/coinjoin`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify(req),
    signal,
  })
}

/**
 * Fetch the contents of JM's yigen-statement.csv file.
 *
 * @param signal AbortSignal
 * @returns object with prop `yigen_data` representing contents of yigen-statement.csv as array of strings
 *
 * e.g.
 * ```json
 * {
 *  "yigen_data": [
 *    "timestamp,cj amount/satoshi,my input count,my input value/satoshi,cjfee/satoshi,earned/satoshi,confirm time/min,notes\n",
 *    "2009/01/03 02:54:42,,,,,,,Connected\n",
 *    "2009/01/09 02:55:13,14999992400,4,20000000000,250,250,60.17,\n",
 *    "2009/01/09 03:02:48,11093696866,3,15000007850,250,250,12.17,\n",
 *    "2009/02/01 17:31:03,3906287184,1,5000000000,250,250,30.08,\n",
 *    "2009/02/04 16:22:18,9687053174,2,10000000000,250,250,0.0,\n",
 *    "2009/02/12 22:01:57,1406636022,1,2500000000,250,250,4.08,\n",
 *    "2009/03/07 09:38:12,9687049154,2,10000000000,250,250,0.0,\n"
 *  ]
 * }
 * ```
 */
const getYieldgenReport = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/yieldgen/report`, {
    signal,
  })
}

const postFreeze = async (
  { token, signal, walletName }: WalletRequestContext,
  { utxo, freeze = true }: FreezeRequest
) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/freeze`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      'utxo-string': utxo,
      freeze,
    }),
    signal,
  })
}

const postSchedulerStart = async ({ token, signal, walletName }: WalletRequestContext, req: StartSchedulerRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/taker/schedule`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({ ...req }),
    signal,
  })
}

const getSchedulerStop = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/taker/stop`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getSchedule = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/taker/schedule`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

/**
 * Get the value of a specific config setting. Note that values are always returned as string.
 *
 * @returns an object with property `configvalue` as string
 */
const postConfigGet = async ({ token, signal, walletName }: WalletRequestContext, req: ConfigSetRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletName)}/configget`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify(req),
    signal,
  })
}

export class JmApiError extends Error {
  public response: Response

  constructor(message: string, response: Response) {
    super(message)
    this.response = response
  }
}

const Helper = (() => {
  const extractErrorMessage = async (response: Response, fallbackReason = response.statusText): Promise<string> => {
    try {
      // The server will answer with a html response instead of json on certain errors.
      // The situation is mitigated by parsing the returned html.
      const isHtmlErrorMessage = response.headers && response.headers.get('content-type') === 'text/html'

      if (isHtmlErrorMessage) {
        return await response
          .text()
          .then((html) => {
            var parser = new DOMParser()
            var doc = parser.parseFromString(html, 'text/html')
            return doc.title || fallbackReason
          })
          .then((reason) => `The server reported a problem: ${reason}`)
      }

      const { message }: ApiError = await response.json()
      return message || fallbackReason
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Will use fallback reason - Error while extracting error message from api response:', err)
      }

      return fallbackReason
    }
  }

  const throwError = async (response: Response, fallbackReason = response.statusText): Promise<never> => {
    throw new JmApiError(await extractErrorMessage(response, fallbackReason), response)
  }

  return {
    throwError,
    extractErrorMessage,
  }
})()

export {
  postMakerStart,
  getMakerStop,
  getSession,
  postDirectSend,
  postCoinjoin,
  getAddressNew,
  getAddressTimelockNew,
  getWalletAll,
  postWalletCreate,
  getWalletDisplay,
  getWalletLock,
  postWalletUnlock,
  getWalletUtxos,
  getYieldgenReport,
  postFreeze,
  postConfigGet,
  getWalletSeed,
  postSchedulerStart,
  getSchedulerStop,
  getSchedule,
  Helper,
}
