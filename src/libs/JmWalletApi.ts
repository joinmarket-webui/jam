/**
 * Simple collection of api requests to jmwalletd.
 *
 * This is not aiming to be feature-complete.
 *
 * See OpenAPI spec: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/api/wallet-rpc.yaml
 *
 * Because we forward all requests through a proxy, additional functionality
 * can be provided. One adaptation is to send the Authorization header as
 * 'x-jm-authorization' so that the reverse proxy can apply its own
 * authentication mechanism.
 */
const BASE_PATH = `${window.JM.PUBLIC_PATH}/api`

type ApiToken = string
type WalletName = string

type Mixdepth = number
type AmountSats = BigInt
type BitcoinAddress = string

type WithWalletName = {
  walletName: WalletName
}
type WithMixdepth = {
  mixdepth: Mixdepth
}

interface ApiRequestContext {
  signal?: AbortSignal
}

interface AuthApiRequestContext extends ApiRequestContext {
  token: ApiToken
}

type WalletRequestContext = AuthApiRequestContext & WithWalletName

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

const getSession = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/session`, { signal })
}

const getAddressNew = async ({ token, signal, walletName, mixdepth }: WalletRequestContext & WithMixdepth) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/address/new/${mixdepth}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletAll = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/all`, {
    signal,
  })
}

type WalletType = 'sw-fb'

interface CreateWalletRequest {
  wallettype: WalletType
  walletname: WalletName
  password: string
}

const postWalletCreate = async (req: CreateWalletRequest) => {
  const walletname = req.walletname.endsWith('.jmdat') ? req.walletname : `${req.walletname}.jmdat`

  return await fetch(`${BASE_PATH}/v1/wallet/create`, {
    method: 'POST',
    body: JSON.stringify({ ...req, walletname, wallettype: 'sw-fb' }),
  })
}

const getWalletDisplay = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/display`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletSeed = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/getseed`, {
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
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/lock`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

interface WalletUnlockRequest {
  password: string
}

const postWalletUnlock = async (
  { signal, walletName }: ApiRequestContext & WithWalletName,
  { password }: WalletUnlockRequest
) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    signal,
  })
}

const getWalletUtxos = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/utxos`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

type OrderType = 'sw0reloffer' | 'sw0absoffer'

interface StartMakerRequest {
  cjfee_a: AmountSats
  cjfee_r: number
  ordertype: OrderType
  minsize: AmountSats
}

const postMakerStart = async ({ token, signal, walletName }: WalletRequestContext, req: StartMakerRequest) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/maker/start`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({ ...req, txfee: '0' }),
    signal,
  })
}

/**
 * Stop the yield generator service.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getMakerStop = async ({ token, signal, walletName }: WalletRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/maker/stop`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

interface DirectSendRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
}

const postDirectSend = async ({ token, signal, walletName }: WalletRequestContext, req: DirectSendRequest) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/taker/direct-send`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    // docs say "integer", but "midxdepth" must serialize as string!
    body: JSON.stringify({ ...req, mixdepth: String(req.mixdepth) }),
    signal,
  })
}

interface DoCoinjoinRequest {
  mixdepth: Mixdepth
  destination: BitcoinAddress
  amount_sats: AmountSats
  counterparties: number
}

const postCoinjoin = async ({ token, signal, walletName }: WalletRequestContext, req: DoCoinjoinRequest) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/taker/coinjoin`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    // docs say "integer", but "midxdepth" must serialize as string!
    body: JSON.stringify({ ...req, mixdepth: String(req.mixdepth) }),
    signal,
  })
}

const getYieldgenReport = async ({ signal }: ApiRequestContext) => {
  return await fetch(`${BASE_PATH}/v1/wallet/yieldgen/report`, {
    signal,
  })
}

interface FreezeRequest {
  utxo: string
  freeze: boolean
}

const postFreeze = async (
  { token, signal, walletName }: WalletRequestContext,
  { utxo, freeze = true }: FreezeRequest
) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/freeze`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      'utxo-string': utxo,
      freeze,
    }),
    signal,
  })
}

interface ConfigSetRequest {
  section: string
  field: string
}

/**
 * Get the value of a specific config setting. Note that values are always returned as string.
 *
 * @returns an object with property `configvalue` as string
 */
const postConfigGet = async ({ token, signal, walletName }: WalletRequestContext, req: ConfigSetRequest) => {
  return await fetch(`${BASE_PATH}/v1/wallet/${walletName}/configget`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify(req),
    signal,
  })
}

export {
  postMakerStart,
  getMakerStop,
  getSession,
  postDirectSend,
  postCoinjoin,
  getAddressNew,
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
}
