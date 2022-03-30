import React, { createContext, useEffect, useState, useContext } from 'react'

import { useCurrentWallet } from './WalletContext'

const WEBSOCKET_RECONNECT_DELAY_STEP = 1_000
const WEBSOCKET_RECONNECT_MAX_DELAY = 10_000
const WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION = 10_000

// minimum amount of time in milliseconds the connection must stay open to be considered "healthy"
const WEBSOCKET_CONNECTION_HEALTHY_DURATION = 1_000

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
const WEBSOCKET_ENDPOINT_PATH = `${window.JM.PUBLIC_PATH}/jmws`

// possible values for property `coinjoin_state` in websocket messages
const CJ_STATE_TAKER_RUNNING = 0
const CJ_STATE_MAKER_RUNNING = 1
const CJ_STATE_NONE_RUNNING = 2

const NOOP = () => {}
const logToDebugConsoleInDevMode = process.env.NODE_ENV === 'development' ? console.debug : NOOP

const createWebSocket = () => {
  const { protocol, host } = window.location
  const scheme = protocol === 'https:' ? 'wss' : 'ws'
  const websocket = new WebSocket(`${scheme}://${host}${WEBSOCKET_ENDPOINT_PATH}`)

  websocket.onerror = (error) => {
    console.error('[Websocket] error', error)
  }

  websocket.onopen = () => {
    logToDebugConsoleInDevMode('[Websocket] connection openend')
  }

  websocket.onclose = (event) => {
    logToDebugConsoleInDevMode('[Websocket] connection closed', event.code)
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
  const [isWebsocketHealthy, setIsWebsocketHealthy] = useState(false)
  const setConnectionErrorCount = useState(0)[1]
  const currentWallet = useCurrentWallet()

  // update websocket state based on open/close events
  useEffect(() => {
    const abortCtrl = new AbortController()
    const onStateChange = () => !abortCtrl.signal.aborted && setWebsocketState(websocket.readyState)

    websocket.addEventListener('open', onStateChange, { signal: abortCtrl.signal })
    websocket.addEventListener('close', onStateChange, { signal: abortCtrl.signal })

    return () => abortCtrl.abort()
  }, [websocket])

  useEffect(() => {
    if (isWebsocketHealthy) {
      // connection must be healthy before the error counter can be reset.
      // otherwise the back-off mechanism assumes connections to be stable
      // and will always use the minimum delay between reconnect attempts.
      setConnectionErrorCount(0)
    }

    logToDebugConsoleInDevMode('[Websocket] healthy', isWebsocketHealthy)
  }, [isWebsocketHealthy, setConnectionErrorCount])

  // reconnect handling in case the socket is closed
  useEffect(() => {
    const abortCtrl = new AbortController()
    let assumeHealthyDelayTimer
    let retryDelayTimer
    const onOpen = (event) => {
      assumeHealthyDelayTimer = setTimeout(() => {
        if (abortCtrl.signal.aborted) return

        const stillConnectedToSameSocket = event.target === websocket
        const websocketOpen = websocket.readyState === WebSocket.OPEN
        const healthy = stillConnectedToSameSocket && websocketOpen
        setIsWebsocketHealthy(healthy)
      }, WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    }
    const onClose = () => {
      if (abortCtrl.signal.aborted) return

      setIsWebsocketHealthy(false)

      setConnectionErrorCount((prev) => {
        const retryAttempt = prev + 1
        const retryDelay = connectionRetryDelayLinear(retryAttempt)

        console.debug(`[Websocket] ${new Date().toLocaleString()} ${retryAttempt}. retry to connect in ${retryDelay}ms`)
        retryDelayTimer = setTimeout(() => {
          console.debug(`[Websocket] ${new Date().toLocaleString()} ${retryAttempt}. retry: Create socket..`)
          setWebsocket(createWebSocket())
        }, retryDelay)
        return prev + 1
      })
    }

    websocket.addEventListener('open', onOpen, { signal: abortCtrl.signal })
    websocket.addEventListener('close', onClose, { signal: abortCtrl.signal })

    return () => {
      clearTimeout(assumeHealthyDelayTimer)
      clearTimeout(retryDelayTimer)
      abortCtrl.abort()
    }
  }, [websocket, setConnectionErrorCount])

  useEffect(() => {
    const abortCtrl = new AbortController()
    const forceCloseIfStillConnectingTimer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return
      // Problem:
      //   Some browsers will keep connecting longer than the retry delay, and if the service
      //   comes back up in the meantime, the connection fails nonetheless...
      //   A retry is only attempted, when the close listener is invoked.
      //
      // Solution:
      //   If the socket is still `CONNECTING` after a certain duration.. force-close it!
      //   e.g. this happens in Firefox after >10 attempts
      //
      // This ensures that the maximum amount of delay between retries is
      // `WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION + WEBSOCKET_RECONNECT_MAX_DELAY`:
      // - WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION to force-close a pending connection
      // - WEBSOCKET_RECONNECT_MAX_DELAY to attempt the retry
      const needsForceClose = websocket.readyState === WebSocket.CONNECTING
      logToDebugConsoleInDevMode(
        `[Websocket] ${new Date().toLocaleString()} Check if a force-close is needed..`,
        needsForceClose
      )
      if (needsForceClose) {
        websocket.close(1000, 'Force-close pending connection')
      }
    }, WEBSOCKET_ESTABLISH_CONNECTION_MAX_DURATION)

    return () => {
      clearTimeout(forceCloseIfStillConnectingTimer)
      abortCtrl.abort()
    }
  }, [websocket])

  useEffect(() => {
    const abortCtrl = new AbortController()

    // The client must send the authentication token when it connects,
    // otherwise it will not receive any notifications.
    const initNotifications = () => {
      if (!currentWallet) return

      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(currentWallet.token)
      } else if (websocket.readyState === WebSocket.CONNECTING) {
        websocket.addEventListener(
          'open',
          (e) => !abortCtrl.signal.aborted && e.isTrusted && currentWallet && websocket.send(currentWallet.token),
          {
            once: true,
            signal: abortCtrl.signal,
          }
        )
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
