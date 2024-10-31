import { createContext, useEffect, useCallback, useState, useContext, PropsWithChildren, useMemo, useRef } from 'react'
import { getSession, setSession } from '../session'
import * as fb from '../components/fb/utils'
import * as Api from '../libs/JmWalletApi'
import { WalletBalanceSummary, toBalanceSummary } from './BalanceSummary'
import { JM_API_AUTH_TOKEN_EXPIRY } from '../constants/jm'
import { isDevMode } from '../constants/debugFeatures'
import { setIntervalDebounced, walletDisplayName } from '../utils'

const API_AUTH_TOKEN_RENEW_INTERVAL: Milliseconds = isDevMode()
  ? 60 * 1_000
  : Math.round(JM_API_AUTH_TOKEN_EXPIRY * 0.75)

export type MinimalWalletContext = Api.WithWalletFileName & Api.WithApiToken

export type CurrentWallet = MinimalWalletContext & {
  displayName: string
}

class CurrentWalletImpl implements CurrentWallet {
  readonly walletFileName: Api.WalletFileName
  readonly #displayName: string
  token: Api.ApiToken // TODO: should be private

  constructor(ctx: MinimalWalletContext) {
    this.walletFileName = ctx.walletFileName
    this.#displayName = walletDisplayName(ctx.walletFileName)
    this.token = ctx.token
  }

  get displayName() {
    return this.#displayName
  }

  updateToken(token: Api.ApiToken) {
    this.token = token
  }
}

// TODO: move these interfaces to JmWalletApi, once distinct types are used as return value instead of plain "Response"
export type Utxo = {
  address: Api.BitcoinAddress
  path: string
  label: string
  value: Api.AmountSats
  tries: number
  tries_remaining: number
  external: boolean
  mixdepth: number
  confirmations: number
  frozen: boolean
  utxo: Api.UtxoId
  // `locktime` in format "yyyy-MM-dd 00:00:00"
  // NOTE: it is unparsable with safari Date constructor
  locktime?: string
}

export type Utxos = Utxo[]

interface UtxosResponse {
  utxos: Utxos
}

interface WalletDisplayResponse {
  walletinfo: WalletDisplayInfo
}

type BalanceString = `${number}.${string}`

interface WalletDisplayInfo {
  wallet_name: string
  total_balance: BalanceString
  /**
   * @since clientserver v0.9.7
   * @description available balance (total - frozen - locked)
   *   This value can report less than available in case of address reuse.
   *   See https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1285#issuecomment-1136438072
   *   Utxos controlled by the same key will not be taken into account if at least one output is
   *   frozen (last checked on 2022-05-24).
   */
  available_balance: BalanceString
  accounts: Account[]
}

export interface Account {
  account: string
  account_balance: BalanceString
  available_balance: BalanceString
  branches: Branch[]
}

export interface Branch {
  branch: string
  balance: BalanceString
  available_balance: BalanceString
  entries: BranchEntry[]
}

export type AddressStatus = 'new' | 'used' | 'reused' | 'cj-out' | 'change-out' | 'non-cj-change' | 'deposit'

export interface BranchEntry {
  hd_path: string
  address: Api.BitcoinAddress
  amount: BalanceString
  available_balance: BalanceString
  status: AddressStatus
  label: string
  extradata: string
}

export type CombinedRawWalletData = {
  utxos: UtxosResponse
  display: WalletDisplayResponse
}

type AddressInfo = {
  status: AddressStatus
  address: Api.BitcoinAddress
}

type AddressSummary = {
  [key: Api.BitcoinAddress]: AddressInfo
}

type FidelityBondSummary = {
  fbOutputs: Utxos
}

export type UtxosByJar = { [key: JarIndex]: Utxos }

export interface WalletInfo {
  balanceSummary: WalletBalanceSummary
  addressSummary: AddressSummary
  fidelityBondSummary: FidelityBondSummary
  utxosByJar: UtxosByJar
  data: CombinedRawWalletData
}

interface WalletContextEntry<T extends CurrentWallet> {
  currentWallet: T | null
  setCurrentWallet: (props: MinimalWalletContext) => void
  clearCurrentWallet: () => void
  currentWalletInfo: WalletInfo | undefined
  reloadCurrentWalletInfo: {
    reloadAll: ({ signal }: { signal: AbortSignal }) => Promise<WalletInfo>
    reloadAllForce: ({ signal }: { signal: AbortSignal }) => Promise<WalletInfo>
    reloadUtxos: ({ signal }: { signal: AbortSignal }) => Promise<UtxosResponse>
  }
}

const toAddressSummary = (res: WalletDisplayResponse): AddressSummary => {
  const accounts = res.walletinfo.accounts
  return accounts
    .flatMap((it) => it.branches)
    .flatMap((it) => it.entries)
    .reduce((acc, { address, status }) => {
      acc[address] = { address, status }
      return acc
    }, {} as AddressSummary)
}

const toFidelityBondSummary = (res: UtxosResponse): FidelityBondSummary => {
  const fbOutputs = res.utxos
    .filter((utxo) => fb.utxo.isFidelityBond(utxo))
    .sort((a, b) => {
      const aLocked = fb.utxo.isLocked(a)
      const bLocked = fb.utxo.isLocked(b)

      if (aLocked && bLocked) {
        return b.value - a.value
      } else {
        return aLocked ? -1 : 1
      }
    })
  return {
    fbOutputs,
  }
}

const WalletContext = createContext<WalletContextEntry<CurrentWalletImpl> | undefined>(undefined)

const restoreWalletFromSession = (): CurrentWalletImpl | null => {
  const session = getSession()
  return session?.walletFileName && session?.auth?.token
    ? new CurrentWalletImpl({
        walletFileName: session.walletFileName,
        token: session.auth.token,
      })
    : null
}

export const groupByJar = (utxos: Utxos): UtxosByJar => {
  return utxos.reduce((res, utxo) => {
    const { mixdepth } = utxo
    res[mixdepth] = res[mixdepth] || []
    res[mixdepth].push(utxo)
    return res
  }, {} as UtxosByJar)
}

const toWalletInfo = (data: CombinedRawWalletData): WalletInfo => {
  const balanceSummary = toBalanceSummary(data)
  const addressSummary = toAddressSummary(data.display)
  const fidelityBondSummary = toFidelityBondSummary(data.utxos)
  const utxosByJar = groupByJar(data.utxos.utxos)

  return {
    balanceSummary,
    addressSummary,
    fidelityBondSummary,
    utxosByJar,
    data,
  }
}

const toCombinedRawData = (utxos: UtxosResponse, display: WalletDisplayResponse) => ({ utxos, display })

const WalletProvider = ({ children }: PropsWithChildren<any>) => {
  const [currentWallet, setCurrentWalletOrNull] = useState(restoreWalletFromSession)

  const setCurrentWallet = useCallback(
    (ctx: MinimalWalletContext) => {
      setCurrentWalletOrNull(new CurrentWalletImpl(ctx))
    },
    [setCurrentWalletOrNull],
  )

  const clearCurrentWallet = useCallback(() => {
    setCurrentWalletOrNull(null)
  }, [setCurrentWalletOrNull])

  const [utxoResponse, setUtxoResponse] = useState<UtxosResponse>()
  const [displayResponse, setDisplayResponse] = useState<WalletDisplayResponse>()

  const fetchUtxos = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load wallet info: Wallet not present')
      }

      return await Api.getWalletUtxos({ ...currentWallet, signal }).then(
        (res): Promise<UtxosResponse> => (res.ok ? res.json() : Api.Helper.throwError(res)),
      )
    },
    [currentWallet],
  )

  const fetchDisplay = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      if (!currentWallet) {
        throw new Error('Cannot load wallet info: Wallet not present')
      }

      const { walletFileName, token } = currentWallet
      return await Api.getWalletDisplay({ walletFileName, token, signal }).then(
        (res): Promise<WalletDisplayResponse> => (res.ok ? res.json() : Api.Helper.throwError(res)),
      )
    },
    [currentWallet],
  )

  const reloadUtxos = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const response = await fetchUtxos({ signal })
      if (!signal.aborted) {
        setUtxoResponse(response)
      }
      return response
    },
    [fetchUtxos],
  )

  const reloadDisplay = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const response = await fetchDisplay({ signal })
      if (!signal.aborted) {
        setDisplayResponse(response)
      }
      return response
    },
    [fetchDisplay],
  )

  const reloadAllForce = useCallback(
    ({ signal }: { signal: AbortSignal }): Promise<WalletInfo> =>
      Promise.all([reloadUtxos({ signal }), reloadDisplay({ signal })])
        .then((data) => toCombinedRawData(data[0], data[1]))
        .then((raw) => toWalletInfo(raw)),
    [reloadUtxos, reloadDisplay],
  )

  const combinedRawData = useMemo<CombinedRawWalletData | undefined>(() => {
    if (!utxoResponse || !displayResponse) return
    return toCombinedRawData(utxoResponse, displayResponse)
  }, [utxoResponse, displayResponse])

  const currentWalletInfo = useMemo(() => {
    if (!combinedRawData) return
    return toWalletInfo(combinedRawData)
  }, [combinedRawData])

  const currentWalletInfoRef = useRef(currentWalletInfo)

  useEffect(() => {
    currentWalletInfoRef.current = currentWalletInfo
  }, [currentWalletInfoRef, currentWalletInfo])

  const reloadAllIfNecessary = useCallback(
    ({ signal }: { signal: AbortSignal }): Promise<WalletInfo> =>
      reloadUtxos({ signal }).then((utxoResponse) => {
        const needsDisplayReload =
          currentWalletInfoRef.current === undefined ||
          !!utxoResponse.utxos.find(
            (utxo) =>
              // reload "display" data if:
              // no address summary could be found for a returned UTXO...
              currentWalletInfoRef.current!.addressSummary[utxo.address] === undefined ||
              // ...or if the address is still considered "new"
              currentWalletInfoRef.current!.addressSummary[utxo.address].status === 'new',
          )

        if (!needsDisplayReload) {
          return currentWalletInfoRef.current!
        }

        return reloadDisplay({ signal })
          .then((displayResponse) => toCombinedRawData(utxoResponse, displayResponse))
          .then((raw) => toWalletInfo(raw))
      }),
    [currentWalletInfoRef, reloadUtxos, reloadDisplay],
  )

  const reloadCurrentWalletInfo = useMemo(
    () => ({
      reloadAll: reloadAllIfNecessary,
      reloadAllForce,
      reloadUtxos,
    }),
    [reloadAllIfNecessary, reloadUtxos, reloadAllForce],
  )

  useEffect(() => {
    if (!currentWallet) {
      setUtxoResponse(undefined)
      setDisplayResponse(undefined)
    }
  }, [currentWallet])

  useEffect(() => {
    if (!currentWallet) return

    const abortCtrl = new AbortController()

    const renewToken = async () => {
      const session = getSession()
      if (!session?.auth?.refresh_token) {
        console.warn('Cannot renew auth token - no refresh_token available.')
        return
      }

      return Api.postToken(
        { token: session.auth.token, signal: abortCtrl.signal },
        {
          grant_type: 'refresh_token',
          refresh_token: session.auth.refresh_token,
        },
      )
        .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
        .then((body) => {
          const auth = Api.Helper.parseAuthProps(body)

          setSession({ walletFileName: currentWallet.walletFileName, auth })
          currentWallet.updateToken(auth.token)
          console.debug('Successfully renewed auth token.')
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            console.error(err)
          }
        })
    }

    let interval: NodeJS.Timeout
    setIntervalDebounced(renewToken, API_AUTH_TOKEN_RENEW_INTERVAL, (timerId) => (interval = timerId))

    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [currentWallet])

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        setCurrentWallet,
        clearCurrentWallet,
        currentWalletInfo,
        reloadCurrentWalletInfo,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

const useCurrentWallet = (): CurrentWallet | null => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useCurrentWallet must be used within a WalletProvider')
  }
  return context.currentWallet
}

const useSetCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useSetCurrentWallet must be used within a WalletProvider')
  }
  return context.setCurrentWallet
}

const useClearCurrentWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useClearCurrentWallet must be used within a WalletProvider')
  }
  return context.clearCurrentWallet
}

const useCurrentWalletInfo = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useCurrentWalletInfo must be used within a WalletProvider')
  }
  return context.currentWalletInfo
}

const useReloadCurrentWalletInfo = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useReloadCurrentWalletInfo must be used within a WalletProvider')
  }
  return context.reloadCurrentWalletInfo
}

export {
  WalletContext,
  WalletProvider,
  useCurrentWallet,
  useSetCurrentWallet,
  useClearCurrentWallet,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
}
