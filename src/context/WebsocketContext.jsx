import React, { createContext, useEffect, useState, useContext } from 'react'

import { useCurrentWallet } from './WalletContext'

// delay in milliseconds to attempt reconnecting after the connection has been lost
const WEBSOCKET_RECONNECT_DELAY = 1_000

const createWebSocket = () => {
  const { protocol, host } = window.location
  const scheme = protocol === 'https:' ? 'wss' : 'ws'
  const websocket = new WebSocket(`${scheme}://${host}/jmws`)

  websocket.onopen = () => {
    console.debug('websocket connection openend')
  }

  websocket.onclose = () => {
    console.debug('websocket connection closed')
  }

  websocket.onerror = (error) => {
    console.error('websocket error', error)
  }

  websocket.onmessage = (event) => {
    const data = JSON.parse(event?.data)
    console.debug('websocket message', data)
  }

  return websocket
}

const initialWebsocket = createWebSocket()

const WebsocketContext = createContext()

const WebsocketProvider = ({ children }) => {
  const [websocket, setWebsocket] = useState(initialWebsocket)
  const [websocketState, setWebsocketState] = useState(initialWebsocket.readyState)
  const currentWallet = useCurrentWallet()

  useEffect(() => {
    const onStateChange = () => setWebsocketState(websocket.readyState)

    websocket.addEventListener('open', onStateChange)
    websocket.addEventListener('close', onStateChange)

    return () => {
      websocket.removeEventListener('close', onStateChange)
      websocket.removeEventListener('open', onStateChange)
    }
  }, [websocket])

  useEffect(() => {
    const onClose = () =>
      setTimeout(() => {
        setWebsocket(createWebSocket())
      }, WEBSOCKET_RECONNECT_DELAY)

    websocket.addEventListener('close', onClose)

    return () => websocket.removeEventListener('close', onClose)
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
        websocket.addEventListener('open', (e) => e.isTrusted && currentWallet && websocket.send(currentWallet.token), {
          once: true,
          signal: abortCtrl.signal,
        })
      }
    }

    initNotifications()

    return () => {
      abortCtrl.abort()
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

export { WebsocketContext, WebsocketProvider, useWebsocket, useWebsocketState }
