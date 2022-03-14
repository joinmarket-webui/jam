import React, { createContext, useCallback, useContext, useReducer, useState, useEffect } from 'react'

import { useCurrentWallet, useSetCurrentWallet, useSetCurrentWalletInfo } from './WalletContext'
import { useWebsocket, CJ_STATE_TAKER_RUNNING, CJ_STATE_MAKER_RUNNING } from './WebsocketContext'
import { clearSession } from '../session'

import * as Api from '../libs/JmWalletApi'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

const SessionInfoContext = createContext()

const SessionInfoProvider = ({ children }) => {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()
  const websocket = useWebsocket()

  const [sessionInfo, setSessionInfo] = useReducer((state, obj) => ({ ...state, ...obj }), null)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    const shouldResetState = connectionError != null
    if (shouldResetState) {
      // Just reset the wallet info, not the session storage (token),
      // as the connection might be down shortly and auth information
      // is still valid most of the time.
      setCurrentWallet(null)
      setCurrentWalletInfo(null)
    }
  }, [connectionError, setCurrentWallet, setCurrentWalletInfo])

  useEffect(() => {
    const abortCtrl = new AbortController()

    const refreshSession = () => {
      Api.getSession({ signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
        .then((data) => {
          if (!abortCtrl.signal.aborted) {
            const { maker_running, coinjoin_in_process, wallet_name, session } = data
            setSessionInfo({ maker_running, coinjoin_in_process, wallet_name, session })
            setConnectionError(null)

            const activeWalletName = wallet_name !== 'None' ? wallet_name : null

            const shouldResetState = currentWallet && (!activeWalletName || currentWallet.name !== activeWalletName)
            if (shouldResetState) {
              setCurrentWallet(null)
              setCurrentWalletInfo(null)
              clearSession()
            }
          }
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            setConnectionError(err)
          }
        })
    }

    refreshSession()
    const interval = setInterval(refreshSession, SESSION_REQUEST_INTERVAL)
    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [setSessionInfo, setConnectionError, currentWallet, setCurrentWallet, setCurrentWalletInfo])

  // update maker/taker indicator based on websocket data
  const onWebsocketMessage = useCallback(
    (message) => {
      const data = JSON.parse(message?.data)

      // update the maker/taker indicator according to `coinjoin_state` property
      if (data && typeof data.coinjoin_state === 'number') {
        setSessionInfo({ coinjoin_in_process: data.coinjoin_state === CJ_STATE_TAKER_RUNNING })
        setSessionInfo({ maker_running: data.coinjoin_state === CJ_STATE_MAKER_RUNNING })
      }
    },
    [setSessionInfo]
  )

  useEffect(() => {
    if (!websocket) return

    websocket.addEventListener('message', onWebsocketMessage)

    return () => websocket && websocket.removeEventListener('message', onWebsocketMessage)
  }, [websocket, onWebsocketMessage])

  return (
    <SessionInfoContext.Provider value={{ sessionInfo, setSessionInfo, connectionError }}>
      {children}
    </SessionInfoContext.Provider>
  )
}

const useSessionInfo = () => {
  const context = useContext(SessionInfoContext)
  if (context === undefined) {
    throw new Error('useSessionInfo must be used within a SessionInfoProvider')
  }
  return context.sessionInfo
}

const useSessionConnectionError = () => {
  const context = useContext(SessionInfoContext)
  if (context === undefined) {
    throw new Error('useSessionConnectionError must be used within a SessionInfoProvider')
  }
  return context.connectionError
}

export { SessionInfoContext, SessionInfoProvider, useSessionInfo, useSessionConnectionError }
