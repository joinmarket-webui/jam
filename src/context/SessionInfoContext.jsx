import React, { createContext, useCallback, useContext, useReducer, useState, useEffect } from 'react'

import { useWebsocket, CJ_STATE_TAKER_RUNNING, CJ_STATE_MAKER_RUNNING } from '../context/WebsocketContext'

import * as Api from '../libs/JmWalletApi'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

const SessionInfoContext = createContext()

const SessionInfoProvider = ({ children }) => {
  const websocket = useWebsocket()

  const [sessionInfo, setSessionInfo] = useReducer((state, obj) => ({ ...state, ...obj }), {})
  const [connectionError, setConnectionError] = useState()

  useEffect(() => {
    const abortCtrl = new AbortController()

    const refreshSession = () => {
      Api.getSession({ signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
        .then((data) => {
          if (!abortCtrl.signal.aborted) {
            setSessionInfo(data)
            setConnectionError(null)
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
  }, [setSessionInfo, setConnectionError])

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

const useUpdateSessionInfo = () => {
  const context = useContext(SessionInfoContext)
  if (context === undefined) {
    throw new Error('useUpdateSessionInfo must be used within a SessionInfoProvider')
  }
  return (key, value) => context.setSessionInfo({ [key]: value })
}

const useSessionConnectionError = () => {
  const context = useContext(SessionInfoContext)
  if (context === undefined) {
    throw new Error('useSessionConnectionError must be used within a SessionInfoProvider')
  }
  return context.connectionError
}

const useSetMakerRunning = () => {
  const updateSessionInfo = useUpdateSessionInfo()
  return (value) => updateSessionInfo('maker_running', value)
}

const useSetCoinjoinInProcess = () => {
  const updateSessionInfo = useUpdateSessionInfo()
  return (value) => updateSessionInfo('coinjoin_in_process', value)
}

export {
  SessionInfoContext,
  SessionInfoProvider,
  useSessionInfo,
  useSessionConnectionError,
  useSetMakerRunning,
  useSetCoinjoinInProcess,
}
