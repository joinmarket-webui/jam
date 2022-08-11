import React, { createContext, useCallback, useContext, useReducer, useState, useEffect, useRef } from 'react'
// @ts-ignore
import { useCurrentWallet, useSetCurrentWallet } from './WalletContext'
// @ts-ignore
import { useWebsocket, CJ_STATE_TAKER_RUNNING, CJ_STATE_MAKER_RUNNING } from './WebsocketContext'
import { clearSession } from '../session'

import * as Api from '../libs/JmWalletApi'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

interface JmSessionData {
  session: boolean
  maker_running: boolean
  coinjoin_in_process: boolean
  wallet_name: Api.WalletName | 'None'
}

type SessionFlag = { sessionActive: boolean }
type MakerRunningFlag = { makerRunning: boolean }
type CoinjoinInProgressFlag = { coinjoinInProgress: boolean }
type WalletName = { walletName: Api.WalletName | null }

type ServiceInfo = SessionFlag & MakerRunningFlag & CoinjoinInProgressFlag & WalletName
type ServiceInfoUpdate = ServiceInfo | MakerRunningFlag | CoinjoinInProgressFlag

interface ServiceInfoContextEntry {
  serviceInfo: ServiceInfo | null
  reloadServiceInfo: ({ signal }: { signal: AbortSignal }) => Promise<ServiceInfo>
  connectionError?: Error
}

const ServiceInfoContext = createContext<ServiceInfoContextEntry | undefined>(undefined)

const ServiceInfoProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const websocket = useWebsocket()

  const fetchSessionInProgress = useRef<Promise<ServiceInfo> | null>(null)

  const [serviceInfo, dispatchServiceInfo] = useReducer(
    (state: ServiceInfo | null, obj: ServiceInfoUpdate) => ({ ...state, ...obj } as ServiceInfo | null),
    null
  )
  const [connectionError, setConnectionError] = useState<Error>()

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
        .then((data: JmSessionData) => {
          const {
            session: sessionActive,
            maker_running: makerRunning,
            coinjoin_in_process: coinjoinInProgress,
            wallet_name: walletNameOrNoneString,
          } = data
          const activeWalletName = walletNameOrNoneString !== 'None' ? walletNameOrNoneString : null
          return { sessionActive, makerRunning, coinjoinInProgress, walletName: activeWalletName } as ServiceInfo
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
    [currentWallet, setCurrentWallet]
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
    <ServiceInfoContext.Provider value={{ serviceInfo, reloadServiceInfo, connectionError }}>
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

const useSessionConnectionError = () => {
  const context = useContext(ServiceInfoContext)
  if (context === undefined) {
    throw new Error('useSessionConnectionError must be used within a ServiceInfoProvider')
  }
  return context.connectionError
}

export { ServiceInfoContext, ServiceInfoProvider, useServiceInfo, useReloadServiceInfo, useSessionConnectionError }
