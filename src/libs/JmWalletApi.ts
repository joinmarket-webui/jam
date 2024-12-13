import { t } from 'i18next'
import { errorResolver } from '../utils'
import createClient from 'openapi-fetch'
import type { paths, components } from './JmWalletApiTypes'
import { Offer, Schedule, ScheduleEntry } from '../context/ServiceInfoContext'

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
const client = createClient<paths>({ baseUrl: `${window.JM.PUBLIC_PATH}/api/v1` })

type WalletFileName = `${string}.jmdat`

// Type Guards/Conversions
export const toWalletFileName = (walletname: string): WalletFileName => {
  return walletname.endsWith('.jmdat') ? (walletname as WalletFileName) : `${walletname}.jmdat`
}

export const toUtxoId = (input: string | undefined): UtxoId | undefined => {
  if (typeof input === 'undefined') {
    return undefined
  }

  // Split the input string by ':' to separate the string and number parts
  const [vout, txId] = input.split(':')

  // Check if num is a valid number and str exists
  if (!vout || isNaN(Number(txId))) {
    throw new Error(`Invalid format: Expected \`string:number\` but received '${input}'`)
  }

  // Return the formatted template literal string
  return `${vout}:${Number(txId)}` as UtxoId
}

export const convertToStartMakerApiRequest = (narrowed: NarrowedStartMakerRequest): StartMakerRequest => {
  return {
    txfee: '0', // this was currently not being passed in the request
    cjfee_a: narrowed.cjfee_a.toString(),
    cjfee_r: narrowed.cjfee_r.toString(),
    ordertype: narrowed.ordertype,
    minsize: narrowed.minsize.toString(),
  }
}

export const convertToCreateWalletApiRequest = (narrowed: NarrowedCreateWalletRequest): CreateWalletRequest => {
  return {
    walletname: narrowed.walletname,
    password: narrowed.password,
    wallettype: narrowed.wallettype ?? 'sw-fb',
  }
}

export const convertToRecoverWalletApiRequest = (narrowed: NarrowedRecoverWalletRequest): RecoverWalletRequest => {
  return {
    walletname: narrowed.walletname,
    password: narrowed.password,
    seedphrase: narrowed.seedphrase,
    wallettype: narrowed.wallettype ?? 'sw-fb',
  }
}

// begin generated types
type CreateWalletRequest = components['schemas']['CreateWalletRequest']
type RecoverWalletRequest = components['schemas']['RecoverWalletRequest']
type TokenRequest = components['schemas']['TokenRequest']
type UnlockWalletRequest = components['schemas']['UnlockWalletRequest']
type StartMakerRequest = components['schemas']['StartMakerRequest']
type DirectSendRequest = components['schemas']['DirectSendRequest']
type DoCoinjoinRequest = components['schemas']['DoCoinjoinRequest']
type FreezeRequest = components['schemas']['FreezeRequest']
type RunScheduleRequest = components['schemas']['RunScheduleRequest']
type ConfigSetRequest = components['schemas']['ConfigSetRequest']
type ConfigGetRequest = components['schemas']['ConfigGetRequest']

type WalletDisplayResponse = components['schemas']['WalletDisplayResponse']
type TokenResponse = components['schemas']['TokenResponse']
type ListUtxosResponse = components['schemas']['ListUtxosResponse']

type Utxos = NonNullable<ListUtxosResponse['utxos']>
type Utxo = Utxos[number]
// end generated types

type Mixdepth = number
type AmountSats = number // TODO: should be BigInt! Remove once every caller migrated to TypeScript.
type BitcoinAddress = string

type Vout = number
type TxId = string
type UtxoId = `${TxId}:${Vout}`

type WithErrorMessage = {
  errorMessage?: string
}

type WithWalletFileName = {
  walletFileName: WalletFileName
}
type WithApiToken = {
  token: string
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

interface NarrowedCreateWalletRequest {
  walletname: WalletFileName | string
  password: string
  wallettype?: WalletType
}

interface NarrowedRecoverWalletRequest {
  walletname: WalletFileName | string
  password: string
  seedphrase: string
  wallettype?: WalletType
}

// only support starting the maker with native segwit offers
type RelOfferType = 'sw0reloffer'
type AbsOfferType = 'sw0absoffer'
type OfferType = RelOfferType | AbsOfferType | string

interface NarrowedStartMakerRequest {
  cjfee_a: AmountSats
  cjfee_r: number
  ordertype: OfferType
  minsize: AmountSats
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
   * @param {string} token the bearer token
   * @returns an object containing the authorization header
   */
  const buildAuthHeader = (token: string) => {
    return { 'x-jm-authorization': `Bearer ${token}` }
  }

  return {
    throwResolved,
    extractErrorMessage,
    buildAuthHeader,
  }
})()

const getGetinfo = async ({ signal }: ApiRequestContext) => {
  const { data, response } = await client.GET('/getinfo', { signal })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getSession = async ({ token, signal }: ApiRequestContext & { token?: string }) => {
  const { data, response } = await client.GET('/session', {
    headers: token ? { ...Helper.buildAuthHeader(token) } : undefined,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  // Transform wallet_name to the narrower WalletFileName type
  const walletFileName: WalletFileName | null = data.wallet_name.endsWith('.jmdat')
    ? (data.wallet_name as WalletFileName)
    : null

  // Transform schedule to the narrower Schedule type
  const schedule: Schedule | undefined = data.schedule
    ?.map((entry) => {
      const [mixdepth, amountFraction, amountCounterparties, destination, waitTime, rounding, stateFlag] = entry

      if (
        typeof mixdepth === 'number' &&
        typeof amountFraction === 'number' &&
        typeof amountCounterparties === 'number' &&
        (destination === 'INTERNAL' || typeof destination === 'string') &&
        typeof waitTime === 'number' &&
        typeof rounding === 'number' &&
        (stateFlag === 0 || stateFlag === 1 || typeof stateFlag === 'string')
      ) {
        return [
          mixdepth,
          amountFraction,
          amountCounterparties,
          destination,
          waitTime,
          rounding,
          stateFlag,
        ] as ScheduleEntry
      }
      return null
    })
    .filter((entry): entry is ScheduleEntry => entry !== null)

  // Transform offer_list to the narrower Offer[] type
  const offers: Offer[] | undefined = data.offer_list
    ?.map((offer) => {
      const { oid, ordertype, minsize, maxsize, txfee, cjfee } = offer

      if (
        typeof oid === 'number' &&
        (ordertype === 'sw0reloffer' || ordertype === 'sw0absoffer' || typeof ordertype === 'string') &&
        typeof minsize === 'number' &&
        typeof maxsize === 'number' &&
        typeof txfee === 'number' &&
        typeof cjfee === 'string'
      ) {
        return {
          oid,
          ordertype: ordertype as OfferType,
          minsize: minsize as AmountSats,
          maxsize: maxsize as AmountSats,
          txfee: txfee as AmountSats,
          cjfee,
        }
      }
      return null
    })
    .filter((offer): offer is Offer => offer !== null)

  return {
    ...data,
    wallet_name: walletFileName,
    schedule,
    offer_list: offers,
  }
}

const postToken = async ({ signal, token }: AuthApiRequestContext, req: TokenRequest) => {
  const { data, response } = await client.POST('/token', {
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getAddressNew = async ({
  token,
  signal,
  walletFileName,
  mixdepth,
  errorMessage,
}: WalletRequestContext & WithMixdepth & WithErrorMessage) => {
  const { data, response } = await client.GET('/wallet/{walletname}/address/new/{mixdepth}', {
    params: { path: { walletname: walletFileName, mixdepth: String(mixdepth) } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    return '' // Ensure destination is always a string
  }

  return data
}

const getAddressTimelockNew = async ({
  token,
  signal,
  walletFileName,
  lockdate,
  errorMessage,
}: WalletRequestContext & WithLockdate & WithErrorMessage) => {
  const { data, response } = await client.GET('/wallet/{walletname}/address/timelock/new/{lockdate}', {
    params: { path: { walletname: walletFileName, lockdate } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getWalletAll = async ({ signal }: ApiRequestContext) => {
  const { data, response } = await client.GET('/wallet/all', { signal })

  if (!response.ok) {
    Helper.throwResolved(response, errorResolver(t, 'wallets.error_loading_failed'))
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  const typedWallets = data.wallets?.map((wallet) => toWalletFileName(wallet)) ?? []

  return typedWallets
}

const postWalletCreate = async ({ signal }: ApiRequestContext, req: CreateWalletRequest) => {
  const { data, response } = await client.POST('/wallet/create', {
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  const walletname = toWalletFileName(data.walletname)

  return {
    ...data,
    walletname,
  }
}

const postWalletRecover = async ({ signal }: ApiRequestContext, req: RecoverWalletRequest) => {
  const { data, response } = await client.POST('/wallet/recover', {
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  const walletname = toWalletFileName(data.walletname)

  return {
    ...data,
    walletname,
  }
}

const getWalletDisplay = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  const { data, response } = await client.GET('/wallet/{walletname}/display', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getWalletSeed = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  const { data, response } = await client.GET('/wallet/{walletname}/getseed', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

/**
 * Block access to a currently decrypted wallet.
 * After this (authenticated) action, the wallet will not be readable or writeable.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getWalletLock = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  const { data, response } = await client.GET('/wallet/{walletname}/lock', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const postWalletUnlock = async (
  { signal, walletFileName }: ApiRequestContext & WithWalletFileName,
  { password }: UnlockWalletRequest,
) => {
  const { data, response } = await client.POST('/wallet/{walletname}/unlock', {
    params: { path: { walletname: walletFileName } },
    body: { password },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  const walletname = toWalletFileName(data.walletname)

  return { ...data, walletname }
}

const getWalletUtxos = async ({
  token,
  signal,
  walletFileName,
  errorMessage,
}: WalletRequestContext & WithErrorMessage) => {
  const { data, response } = await client.GET('/wallet/{walletname}/utxos', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  // Transform only the utxo field into the narrowed UtxoId type, keeping all other fields
  const utxosWithNarrowedUtxo: Array<Omit<NonNullable<typeof data.utxos>[number], 'utxo'> & { utxo: UtxoId }> =
    data.utxos?.map((utxo) => {
      if (!utxo.utxo) {
        throw new Error('UTXO field is missing in the response')
      }

      const [txId, voutStr] = utxo.utxo.split(':')
      const vout = Number(voutStr)

      if (!txId || isNaN(vout)) {
        throw new Error(`Invalid UTXO format: ${utxo.utxo}`)
      }

      const utxoId: UtxoId = `${txId}:${vout}`

      return {
        ...utxo,
        utxo: utxoId,
      }
    }) ?? []

  return { utxos: utxosWithNarrowedUtxo }
}

const postMakerStart = async ({ token, signal, walletFileName }: WalletRequestContext, req: StartMakerRequest) => {
  const { data, response } = await client.POST('/wallet/{walletname}/maker/start', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  // how to handle this never type
  return data
}

/**
 * Stop the yield generator service.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getMakerStop = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  const { data, response } = await client.GET('/wallet/{walletname}/maker/stop', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  // how to handle this never type
  return data
}

const postDirectSend = async (
  { token, signal, walletFileName, errorMessage }: WalletRequestContext & WithErrorMessage,
  req: DirectSendRequest,
) => {
  const { data, response } = await client.POST('/wallet/{walletname}/taker/direct-send', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    //earn.fidelity_bond.error_creating_fidelity_bond
    //Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_spending_fidelity_bond')),
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const postCoinjoin = async ({ token, signal, walletFileName }: WalletRequestContext, req: DoCoinjoinRequest) => {
  const { data, response } = await client.POST('/wallet/{walletname}/taker/coinjoin', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  // how to handle this never type?
  return data
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
  const { data, response } = await client.GET('/wallet/yieldgen/report', { signal })

  // 404 is returned till the maker is started at least once
  if (response.status === 404) return []
  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const postFreeze = async (
  { token, signal, walletFileName, errorMessage }: WalletRequestContext & WithErrorMessage,
  { 'utxo-string': utxo, freeze = true }: FreezeRequest,
) => {
  const { data, response } = await client.POST('/wallet/{walletname}/freeze', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: { 'utxo-string': utxo, freeze },
    signal,
  })

  if (!response.ok) {
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  return data
}

const postSchedulerStart = async ({ token, signal, walletFileName }: WalletRequestContext, req: RunScheduleRequest) => {
  const { data, response } = await client.POST('/wallet/{walletname}/taker/schedule', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response, errorResolver(t, 'scheduler.error_starting_schedule_failed'))
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getTakerStop = async ({
  token,
  signal,
  walletFileName,
  errorMessage,
}: WalletRequestContext & WithErrorMessage) => {
  const { data, response } = await client.GET('/wallet/{walletname}/taker/stop', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    errorMessage ? Helper.throwResolved(response, errorResolver(t, errorMessage)) : Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

const getSchedule = async ({ token, signal, walletFileName }: WalletRequestContext) => {
  const { data, response } = await client.GET('/wallet/{walletname}/taker/schedule', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

/**
 * Change a config variable (for the duration of this backend daemon process instance).
 */
const postConfigSet = async ({ token, signal, walletFileName }: WalletRequestContext, req: ConfigSetRequest) => {
  const { data, response } = await client.POST('/wallet/{walletname}/configset', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
}

/**
 * Get the value of a specific config setting. Note that values are always returned as string.
 *
 * @returns an object with property `configvalue` as string
 */
const postConfigGet = async ({ token, signal, walletFileName }: WalletRequestContext, req: ConfigGetRequest) => {
  const { data, response } = await client.POST('/wallet/{walletname}/configget', {
    params: { path: { walletname: walletFileName } },
    headers: { ...Helper.buildAuthHeader(token) },
    body: req,
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
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
  const { data, response } = await client.GET('/wallet/{walletname}/rescanblockchain/{blockheight}', {
    params: { path: { walletname: walletFileName, blockheight: blockheight } },
    headers: { ...Helper.buildAuthHeader(token) },
    signal,
  })

  if (!response.ok) {
    Helper.throwResolved(response)
  }

  if (typeof data === 'undefined') {
    // do something here
    throw new Error()
  }

  return data
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
  TokenResponse,
  WalletDisplayResponse,
  ListUtxosResponse,
  StartMakerRequest,
  RunScheduleRequest,
  WalletRequestContext,
  WalletFileName,
  WithWalletFileName,
  WithErrorMessage,
  WithApiToken,
  Lockdate,
  TxId,
  UtxoId,
  Utxos,
  Utxo,
  Mixdepth,
  AmountSats,
  OfferType,
  BitcoinAddress,
}
