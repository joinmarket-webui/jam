import { t } from 'i18next'
import { errorResolver } from '../utils'

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

type ApiToken = string
type WalletFileName = `${string}.jmdat`
type GetWalletAllResponse = {
  wallets: WalletFileName[]
}

type Mixdepth = number
type AmountSats = number // TODO: should be BigInt! Remove once every caller migrated to TypeScript.
type BitcoinAddress = string

type Vout = number
type TxId = string
type UtxoId = `${TxId}:${Vout}`

// for JM versions <0.9.11
type SingleTokenAuthContext = {
  token: ApiToken
  refresh_token: undefined
}

// for JM versions >=0.9.11
type RefreshTokenAuthContext = {
  token: ApiToken
  token_type: string // "bearer"
  expires_in: Seconds // 1800
  scope: string
  refresh_token: ApiToken
}

type ApiAuthContext = SingleTokenAuthContext | RefreshTokenAuthContext

type WithWalletFileName = {
  walletFileName: WalletFileName
}
type WithApiToken = {
  token: ApiToken
}
type WithMixdepth = {
  mixdepth: Mixdepth
}

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type YYYY = `2${Digit}${Digit}${Digit}`
type MM = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'
type Lockdate = `${YYYY}-${MM}`
type WithLockdate = {
  lockdate: Lockdate
}
type WithBlockheight = {
  blockheight: number
}

interface ApiRequestContext {
  signal?: AbortSignal
}

type AuthApiRequestContext = ApiRequestContext & WithApiToken
type WalletRequestContext = AuthApiRequestContext & WithWalletFileName

interface ApiError {
  message: string
}

type WalletType = 'sw-fb'

interface TokenRequest {
  grant_type: 'refresh_token' | string
  refresh_token: string
}

interface CreateWalletRequest {
  walletname: WalletFileName | string
  password: string
  wallettype?: WalletType
}

interface RecoverWalletRequest {
  walletname: WalletFileName | string
  password: string
  seedphrase: string
  wallettype?: WalletType
}

interface WalletUnlockRequest {
  password: string
}

// only support starting the maker with native segwit offers
type RelOfferType = 'sw0reloffer'
type AbsOfferType = 'sw0absoffer'
type OfferType = RelOfferType | AbsOfferType | string

interface StartMakerRequest {
  cjfee_a: AmountSats
  cjfee_r: number
  ordertype: OfferType
  minsize: AmountSats
}

interface DirectSendRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
  txfee?: number
}

interface DoCoinjoinRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
  counterparties: number
  txfee?: number
}

interface FreezeRequest {
  utxo: UtxoId
  freeze: boolean
}

interface ConfigSetRequest {
  section: string
  field: string
  value: string
}

interface ConfigGetRequest {
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

  /**
   * @deprecated Use `throwResolved()` instead
   */
  const throwError = async (response: Response, fallbackReason = response.statusText): Promise<never> => {
    throw new JmApiError(response, await extractErrorMessage(response, fallbackReason))
  }

  const DEFAULT_RESOLVER = (res: Response, reason: string) => reason

  const throwResolved = async (
    response: Response,
    { resolver = DEFAULT_RESOLVER, fallbackReason = response.statusText } = {},
  ): Promise<never> => {
    const reason = await extractErrorMessage(response, fallbackReason)
    const errorMessage = resolver(response, reason) || reason
    throw new JmApiError(response, errorMessage)
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
  const buildAuthHeader = (token: ApiToken) => {
    return { 'x-jm-authorization': `Bearer ${token}` }
  }

  // Simple helper method to parse auth properties.
  // TODO: This can be removed when the API methods
  // return typed responses (see #670)
  const parseAuthProps = (body: any): ApiAuthContext => {
    return {
      token: body.token,
      token_type: body.token_type,
      expires_in: body.expires_in,
      scope: body.scope,
      refresh_token: body.refresh_token,
    }
  }

  return {
    throwError,
    throwResolved,
    extractErrorMessage,
    buildAuthHeader,
    parseAuthProps,
  }
})()

const getGetinfo = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${basePath()}/v1/getinfo`, {
    signal,
  })
}

const getSession = async ({ token, signal }: ApiRequestContext & { token?: ApiToken }) => {
  return await fetch(`${basePath()}/v1/session`, {
    headers: token ? { ...Helper.buildAuthHeader(token) } : undefined,
    signal,
  })
}

const postToken = async ({ signal, token }: AuthApiRequestContext, req: TokenRequest) => {
  return await fetch(`${basePath()}/v1/token`, {
    headers: { ...Helper.buildAuthHeader(token) },
    method: 'POST',
    body: JSON.stringify(req),
    signal,
  })
}

const getAddressNew = async ({ token, signal, walletFileName, mixdepth }: WalletRequestContext & WithMixdepth) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/address/new/${mixdepth}`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const getAddressTimelockNew = async ({
  token,
  signal,
  walletFileName,
  lockdate,
}: WalletRequestContext & WithLockdate) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/address/timelock/new/${lockdate}`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const getWalletAll = async ({ signal }: ApiRequestContext): Promise<GetWalletAllResponse> => {
  const response = await fetch(`${basePath()}/v1/wallet/all`, { signal })

  if (!response.ok) {
    Helper.throwResolved(response, errorResolver(t, 'wallets.error_loading_failed'))
  }

  const data: GetWalletAllResponse = await response.json()
  return data
}

const postWalletCreate = async ({ signal }: ApiRequestContext, req: CreateWalletRequest) => {
  const walletname = req.walletname.endsWith('.jmdat') ? req.walletname : `${req.walletname}.jmdat`

  return await fetch(`${basePath()}/v1/wallet/create`, {
    method: 'POST',
    body: JSON.stringify({ ...req, walletname, wallettype: req.wallettype || 'sw-fb' }),
    signal,
  })
}

const postWalletRecover = async ({ signal }: ApiRequestContext, req: RecoverWalletRequest) => {
  const walletname = req.walletname.endsWith('.jmdat') ? req.walletname : `${req.walletname}.jmdat`

  return await fetch(`${basePath()}/v1/wallet/recover`, {
    method: 'POST',
    body: JSON.stringify({ ...req, walletname, wallettype: req.wallettype || 'sw-fb' }),
    signal,
  })
}

const getWalletDisplay = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/display`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const getWalletSeed = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/getseed`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

/**
 * Block access to a currently decrypted wallet.
 * After this (authenticated) action, the wallet will not be readable or writeable.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getWalletLock = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/lock`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const postWalletUnlock = async (
  { signal, walletFileName }: ApiRequestContext & WithWalletFileName,
  { password }: WalletUnlockRequest,
) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    signal,
  })
}

const getWalletUtxos = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/utxos`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const postMakerStart = async ({ token, signal, walletFileName }: WalletRequestContext, req: StartMakerRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/maker/start`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
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
const getMakerStop = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/maker/stop`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const postDirectSend = async ({ token, signal, walletFileName }: WalletRequestContext, req: DirectSendRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/taker/direct-send`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
    body: JSON.stringify(req),
    signal,
  })
}

const postCoinjoin = async ({ token, signal, walletFileName }: WalletRequestContext, req: DoCoinjoinRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/taker/coinjoin`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
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
  { token, signal, walletFileName }: WalletRequestContext,
  { utxo, freeze = true }: FreezeRequest,
) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/freeze`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
    body: JSON.stringify({
      'utxo-string': utxo,
      freeze,
    }),
    signal,
  })
}

const postSchedulerStart = async (
  { token, signal, walletFileName }: WalletRequestContext,
  req: StartSchedulerRequest,
) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/taker/schedule`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
    body: JSON.stringify({ ...req }),
    signal,
  })
}

const getTakerStop = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/taker/stop`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

const getSchedule = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/taker/schedule`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

/**
 * Change a config variable (for the duration of this backend daemon process instance).
 */
const postConfigSet = async ({ token, signal, walletFileName }: WalletRequestContext, req: ConfigSetRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/configset`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
    body: JSON.stringify(req),
    signal,
  })
}

/**
 * Get the value of a specific config setting. Note that values are always returned as string.
 *
 * @returns an object with property `configvalue` as string
 */
const postConfigGet = async ({ token, signal, walletFileName }: WalletRequestContext, req: ConfigGetRequest) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/configget`, {
    method: 'POST',
    headers: { ...Helper.buildAuthHeader(token) },
    body: JSON.stringify(req),
    signal,
  })
}

/**
 * Use this operation on recovered wallets to re-sync the wallet
 */
const getRescanBlockchain = async ({
  token,
  signal,
  walletFileName,
  blockheight,
}: WalletRequestContext & WithBlockheight) => {
  return await fetch(`${basePath()}/v1/wallet/${encodeURIComponent(walletFileName)}/rescanblockchain/${blockheight}`, {
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })
}

class JmApiError extends Error {
  public response: Response

  constructor(response: Response, message: string) {
    super(message)
    this.response = response
  }
}

export {
  getGetinfo,
  postToken,
  postMakerStart,
  getMakerStop,
  getSession,
  postDirectSend,
  postCoinjoin,
  getAddressNew,
  getAddressTimelockNew,
  getWalletAll,
  postWalletCreate,
  postWalletRecover,
  getWalletDisplay,
  getWalletLock,
  postWalletUnlock,
  getWalletUtxos,
  getYieldgenReport,
  postFreeze,
  postConfigSet,
  postConfigGet,
  getWalletSeed,
  postSchedulerStart,
  getTakerStop,
  getSchedule,
  getRescanBlockchain,
  Helper,
  JmApiError,
  ApiAuthContext,
  StartSchedulerRequest,
  StartMakerRequest,
  WalletRequestContext,
  ApiToken,
  WalletFileName,
  WithWalletFileName,
  WithApiToken,
  Lockdate,
  TxId,
  UtxoId,
  Mixdepth,
  AmountSats,
  OfferType,
  BitcoinAddress,
}
