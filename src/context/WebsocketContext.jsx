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
    // The client must send the authentication token when it connects,
    // otherwise it will not receive any notifications.
    const initNotifications = () => {
      if (!websocket.current || !currentWallet) return

      if (websocket.current.readyState === WebSocket.OPEN) {
        websocket.current.send(currentWallet.token)
      } else if (websocket.current.readyState === WebSocket.CONNECTING) {
        websocket.current.onopen = () => {
          websocket.current.send(currentWallet.token)
        }
      }
    }

    initNotifications()
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
