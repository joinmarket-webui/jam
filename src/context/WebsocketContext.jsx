import React, { createContext, useEffect, useRef, useContext } from 'react'

import { useCurrentWallet } from './WalletContext'

const WebsocketContext = createContext()

const WebsocketProvider = ({ children }) => {
  const websocket = useRef(null)
  const currentWallet = useCurrentWallet()

  useEffect(() => {
    if (websocket.current) {
      websocket.current.close()
    }

    const { protocol, host } = window.location
    const scheme = protocol === 'https:' ? 'wss' : 'ws'
    websocket.current = new WebSocket(`${scheme}://${host}/jmws`)

    websocket.current.onopen = () => {
      console.debug('websocket connection openend')
    }

    websocket.current.onclose = () => {
      console.debug('websocket connection closed')
    }

    websocket.current.onerror = (error) => {
      console.error('websocket error', error)
    }

    websocket.current.onmessage = (event) => {
      const wsdata = JSON.parse(event.data)
      console.debug('websocket sent', wsdata)
    }

    const wsCurrent = websocket.current
    return () => {
      wsCurrent.close()
    }
  }, [])

  useEffect(() => {
    const abortCtrl = new AbortController()

    // The client must send the authentication token when it connects,
    // otherwise it will not receive any notifications.
    const initNotifications = () => {
      if (!websocket.current || !currentWallet) return

      const socket = websocket.current

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(currentWallet.token)
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener('open', (e) => e.isTrusted && currentWallet && socket.send(currentWallet.token), {
          once: true,
          signal: abortCtrl.signal,
        })
      }
    }

    initNotifications()

    return () => {
      abortCtrl.abort()
    }
  }, [currentWallet])

  return <WebsocketContext.Provider value={{ websocket: websocket.current }}>{children}</WebsocketContext.Provider>
}

const useWebsocket = () => {
  const context = useContext(WebsocketContext)
  if (context === undefined) {
    throw new Error('useWebsocket must be used within a WebsocketProvider')
  }
  return context.websocket
}

export { WebsocketContext, WebsocketProvider, useWebsocket }
