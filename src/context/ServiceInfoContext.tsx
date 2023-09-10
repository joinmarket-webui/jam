import React, { createContext, useCallback, useContext, useReducer, useState, useEffect, useRef } from 'react'
// @ts-ignore
import { useCurrentWallet, useSetCurrentWallet } from './WalletContext'
// @ts-ignore
import { useWebsocket } from './WebsocketContext'
import { clearSession } from '../session'
import { CJ_STATE_TAKER_RUNNING, CJ_STATE_MAKER_RUNNING } from '../constants/config'

import * as Api from '../libs/JmWalletApi'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

type AmountFraction = number
type AmountCounterparties = number
type SchedulerDestinationAddress = 'INTERNAL' | Api.BitcoinAddress
type WaitTimeInMinutes = number
type Rounding = number
type StateFlag = 0 | 1 | Api.TxId

// [mixdepth, amount-fraction, N-counterparties (requested), destination address, wait time in minutes, rounding, flag indicating incomplete/broadcast/completed (0/txid/1)]
// e.g.
// - [ 2, 0.2456498211214867, 4, "INTERNAL", 0.01, 16, 1 ]
// - [ 3, 0, 8, "bcrt1qpnv3nze7u6ecw63mn06ksxh497a3lryagh233q", 0.04, 16, 0 ]
type ScheduleEntry = [
  Api.Mixdepth,
  AmountFraction,
  AmountCounterparties,
  SchedulerDestinationAddress,
  WaitTimeInMinutes,
  Rounding,
  StateFlag,
]
type Schedule = ScheduleEntry[]

interface Offer {
  oid: number
  ordertype: string
  minsize: Api.AmountSats
  maxsize: Api.AmountSats
  txfee: Api.AmountSats
  cjfee: string
}

interface JmSessionData {
  session: boolean
  maker_running: boolean
  coinjoin_in_process: boolean
  wallet_name: Api.WalletName | 'None'
  schedule: Schedule | null
  offer_list: Offer[] | null
  nickname: string | null
  rescanning: boolean
}

interface JmGetInfoData {
  version: string
}

const UNKNOWN_VERSION: SemVer = { major: 0, minor: 0, patch: 0, raw: 'unknown' }

type SessionFlag = { sessionActive: boolean }
type MakerRunningFlag = { makerRunning: boolean }
type CoinjoinInProgressFlag = { coinjoinInProgress: boolean }
type RescanBlockchainInProgressFlag = { rescanning: boolean }

type SessionInfo = {
  walletName: Api.WalletName | null
  schedule: Schedule | null
  offers: Offer[] | null
  nickname: string | null
}
type ServerInfo = {
  server?: {
    version?: SemVer
  }
}

type ServiceInfo = SessionFlag &
  MakerRunningFlag &
  CoinjoinInProgressFlag &
  RescanBlockchainInProgressFlag &
  SessionInfo &
  ServerInfo
type ServiceInfoUpdate =
  | ServiceInfo
  | MakerRunningFlag
  | CoinjoinInProgressFlag
  | RescanBlockchainInProgressFlag
  | ServerInfo

const versionRegex = new RegExp(/^(\d+)\.(\d+)\.(\d+).*$/)
const toSemVer = (data: JmGetInfoData): SemVer => {
  const arr = versionRegex.exec(data.version)
  if (!arr || arr.length < 4) {
    return UNKNOWN_VERSION
  }

  return {
    major: parseInt(arr[1], 10),
    minor: parseInt(arr[2], 10),
    patch: parseInt(arr[3], 10),
    raw: data.version,
  }
}

interface ServiceInfoContextEntry {
  serviceInfo: ServiceInfo | null
  reloadServiceInfo: ({ signal }: { signal: AbortSignal }) => Promise<ServiceInfo>
  dispatchServiceInfo: React.Dispatch<ServiceInfoUpdate>
  connectionError?: Error
}

const ServiceInfoContext = createContext<ServiceInfoContextEntry | undefined>(undefined)

const ServiceInfoProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const websocket = useWebsocket()

  const fetchSessionInProgress = useRef<Promise<ServiceInfo> | null>(null)

  const [serviceInfo, dispatchServiceInfo] = useReducer(
    (state: ServiceInfo | null, obj: ServiceInfoUpdate) => ({ ...state, ...obj }) as ServiceInfo | null,
    null,
  )
  const [connectionError, setConnectionError] = useState<Error>()

  useEffect(() => {
    const abortCtrl = new AbortController()

    Api.getGetinfo({ signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
      .then((data: JmGetInfoData) => {
        dispatchServiceInfo({
          server: {
            version: toSemVer(data),
          },
        })
      })
      .catch((err) => {
        const notFound = err.response.status === 404
        if (notFound) {
          dispatchServiceInfo({
            server: {
              version: UNKNOWN_VERSION,
            },
          })
        }
      })

    return () => {
      abortCtrl.abort()
    }
  }, [connectionError])

  useEffect(() => {
    if (connectionError) {
      // Just reset the wallet info, not the session storage (token),
      // as the connection might be down shortly and auth information
      // is still valid most of the time.
      setCurrentWallet(null)
    }
  }, [connectionError, setCurrentWallet])

  const reloadServiceInfo = useCallback(
    async ({ signal }: { signal: AbortSignal }) => {
      const resetWalletAndClearSession = () => {
        setCurrentWallet(null)
        clearSession()
      }

      if (fetchSessionInProgress.current !== null) {
        try {
          return await fetchSessionInProgress.current
        } catch (err: unknown) {
          // If a request was in progress but failed, retry!
          // This happens e.g. when the in-progress request was aborted.
          if (!(err instanceof Error) || err.name !== 'AbortError') {
            console.warn('Previous session request resulted in an unexpected error. Retrying!', err)
          }
        }
      }

      const fetch = Api.getSession({ signal, token: currentWallet?.token })
        .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
        .then((data: JmSessionData): ServiceInfo => {
          const {
            session: sessionActive,
            maker_running: makerRunning,
            coinjoin_in_process: coinjoinInProgress,
            wallet_name: walletNameOrNoneString,
            offer_list: offers,
            rescanning,
            schedule,
            nickname,
          } = data
          const activeWalletName = walletNameOrNoneString !== 'None' ? walletNameOrNoneString : null
          return {
            walletName: activeWalletName,
            sessionActive,
            makerRunning,
            coinjoinInProgress,
            schedule,
            offers,
            nickname,
            rescanning,
          }
        })

      fetchSessionInProgress.current = fetch

      return fetch
        .finally(() => {
          fetchSessionInProgress.current = null
        })
        .then((info: ServiceInfo) => {
          if (!signal.aborted) {
            dispatchServiceInfo(info)
            setConnectionError(undefined)

            const activeWalletChanged = currentWallet && (!info.walletName || currentWallet.name !== info.walletName)
            if (activeWalletChanged) {
              resetWalletAndClearSession()
            }
          }
          return info
        })
        .catch((err) => {
          if (!signal.aborted) {
            const isUnauthorized = err instanceof Api.JmApiError && err.response.status === 401
            if (isUnauthorized) {
              resetWalletAndClearSession()
            } else {
              setConnectionError(err)
            }
          }
          throw err
        })
    },
    [currentWallet, setCurrentWallet],
  )

  useEffect(() => {
    const abortCtrl = new AbortController()

    const refreshSession = () => {
      reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => console.error(err))
    }

    refreshSession()

    const interval = setInterval(refreshSession, SESSION_REQUEST_INTERVAL)
    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [reloadServiceInfo])

  // update maker/taker indicator based on websocket data
  const onWebsocketMessage = useCallback((message) => {
    const data = JSON.parse(message?.data)

    // update the maker/taker indicator according to `coinjoin_state` property
    if (data && typeof data.coinjoin_state === 'number') {
      dispatchServiceInfo({
        coinjoinInProgress: data.coinjoin_state === CJ_STATE_TAKER_RUNNING,
        makerRunning: data.coinjoin_state === CJ_STATE_MAKER_RUNNING,
      })
    }
  }, [])

  useEffect(() => {
    if (!websocket) return

    const abortCtrl = new AbortController()
    websocket.addEventListener('message', onWebsocketMessage, { signal: abortCtrl.signal })

    return () => abortCtrl.abort()
  }, [websocket, onWebsocketMessage])

  return (
    <ServiceInfoContext.Provider value={{ serviceInfo, reloadServiceInfo, dispatchServiceInfo, connectionError }}>
      {children}
    </ServiceInfoContext.Provider>
  )
}

const useServiceInfo = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useServiceInfo must be used within a ServiceInfoProvider')
  }
  return context.serviceInfo
}

const useReloadServiceInfo = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useReloadServiceInfo must be used within a ServiceInfoProvider')
  }
  return context.reloadServiceInfo
}

const useDispatchServiceInfo = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useDispatchServiceInfo must be used within a ServiceInfoProvider')
  }
  return context.dispatchServiceInfo
}

const useSessionConnectionError = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useSessionConnectionError must be used within a ServiceInfoProvider')
  }
  return context.connectionError
}

export {
  ServiceInfoContext,
  ServiceInfoProvider,
  useServiceInfo,
  useReloadServiceInfo,
  useDispatchServiceInfo,
  useSessionConnectionError,
  ServiceInfo,
  Schedule,
  StateFlag,
}
