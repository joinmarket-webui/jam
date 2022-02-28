import React, { createContext, useEffect, useState, useContext } from 'react'

import { useCurrentWallet } from './WalletContext'

const WEBSOCKET_RECONNECT_DELAY_STEP = 1_000
const WEBSOCKET_RECONNECT_MAX_DELAY = 10_000

// webservers will close a websocket connection on inactivity (e.g nginx default is 60s)
// specify the time in milliseconds at least one 'keepalive' message is sent
const WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL = 30_000

// return delay in milliseconds to attempt reconnecting after the connection has been lost
const connectionRetryDelayLinear = (attempt = 0) => {
  // linear increase per attempt by `step` amount till `max` is reached
  const delay = Math.max(WEBSOCKET_RECONNECT_DELAY_STEP, WEBSOCKET_RECONNECT_DELAY_STEP * attempt)
  return Math.min(delay, WEBSOCKET_RECONNECT_MAX_DELAY)
}

// path that will be proxied to the backend server
const WEBSOCKET_ENDPOINT_PATH = '/jmws'

// possible values for property `coinjoin_state` in websocket messages
const CJ_STATE_TAKER_RUNNING = 0
const CJ_STATE_MAKER_RUNNING = 1
const CJ_STATE_NONE_RUNNING = 2

const createWebSocket = () => {
  const { protocol, host } = window.location
  const scheme = protocol === 'https:' ? 'wss' : 'ws'
  const websocket = new WebSocket(`${scheme}://${host}${WEBSOCKET_ENDPOINT_PATH}`)

  websocket.onerror = (error) => {
    console.error('websocket error', error)
  }

  if (process.env.NODE_ENV !== 'production') {
    websocket.onopen = () => {
      console.debug('websocket connection openend')
    }

    websocket.onclose = () => {
      console.debug('websocket connection closed')
    }
  }

  return websocket
}

const initialWebsocket = createWebSocket()

const WebsocketContext = createContext()

/**
 * Provider of a websocket connection to jmwalletd.
 *
 * See Websocket docs: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/v0.9.5/docs/JSON-RPC-API-using-jmwalletd.md#websocket
 */
const WebsocketProvider = ({ children }) => {
  const [websocket, setWebsocket] = useState(initialWebsocket)
  const [websocketState, setWebsocketState] = useState(initialWebsocket.readyState)
  const setConnectionErrorCount = useState(0)[1]
  const currentWallet = useCurrentWallet()

  // update websocket state based on open/close events
  useEffect(() => {
    const onStateChange = () => setWebsocketState(websocket.readyState)

    websocket.addEventListener('open', onStateChange)
    websocket.addEventListener('close', onStateChange)

    return () => {
      websocket && websocket.removeEventListener('close', onStateChange)
      websocket && websocket.removeEventListener('open', onStateChange)
    }
  }, [websocket])

  // reconnect handling in case the socket is closed
  useEffect(() => {
    const onOpen = () => setConnectionErrorCount(0)
    const onClose = () => {
      setConnectionErrorCount((prev) => {
        const retryDelay = connectionRetryDelayLinear(prev + 1)
        console.log(`Retrying to connect websocket in ${retryDelay}ms`)
        setTimeout(() => {
          setWebsocket(createWebSocket())
        }, retryDelay)
        return prev + 1
      })
    }

    websocket.addEventListener('open', onOpen)
    websocket.addEventListener('close', onClose)

    return () => {
      websocket && websocket.removeEventListener('close', onClose)
      websocket && websocket.removeEventListener('open', onOpen)
    }
  }, [websocket, setConnectionErrorCount])

  useEffect(() => {
    const abortCtrl = new AbortController()

    // The client must send the authentication token when it connects,
    // otherwise it will not receive any notifications.
    const initNotifications = () => {
      if (!currentWallet) return

      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(currentWallet.token)
      } else if (websocket.readyState === WebSocket.CONNECTING) {
        websocket.addEventListener('open', (e) => e.isTrusted && currentWallet && websocket.send(currentWallet.token), {
          once: true,
          signal: abortCtrl.signal,
        })
      }
    }

    initNotifications()

    const keepaliveInterval = setInterval(initNotifications, WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL)
    return () => {
      abortCtrl.abort()
      clearInterval(keepaliveInterval)
    }
  }, [websocket, currentWallet])

  return <WebsocketContext.Provider value={{ websocket, websocketState }}>{children}</WebsocketContext.Provider>
}

const useWebsocket = () => {
  const context = useContext(WebsocketContext)
  if (context === undefined) {
    throw new Error('useWebsocket must be used within a WebsocketProvider')
  }
  return context.websocket
}

const useWebsocketState = () => {
  const context = useContext(WebsocketContext)
  if (context === undefined) {
    throw new Error('useWebsocketState must be used within a WebsocketProvider')
  }
  return context.websocketState
}

export {
  WebsocketContext,
  WebsocketProvider,
  useWebsocket,
  useWebsocketState,
  CJ_STATE_TAKER_RUNNING,
  CJ_STATE_MAKER_RUNNING,
  CJ_STATE_NONE_RUNNING,
}
