import { useEffect, useMemo, useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { useStore } from 'zustand'
import { pseudoRandomFloat } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import type { Milliseconds } from '@/types/global'

// minimum amount of time in milliseconds the connection must stay open to be considered "healthy"
const WEBSOCKET_CONNECTION_HEALTHY_DURATION: Milliseconds =
  import.meta.env.VITE_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION || 1_000
const WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION: Milliseconds =
  import.meta.env.VITE_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION || 3_000

// webservers will close a websocket connection on inactivity (e.g nginx default is 60s)
// specify the time in milliseconds at least one 'keepalive' message is sent
const WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL: Milliseconds =
  import.meta.env.VITE_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL || 30_000

const WEBSOCKET_RECONNECT_INTERVAL_MIN: Milliseconds = import.meta.env.VITE_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN || 5_000

const WEBSOCKET_RECONNECT_INTERVAL_MAX: Milliseconds =
  import.meta.env.VITE_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX || 60_000

const calcReconnectInterval = (attemptNumber: number): Milliseconds => {
  return Math.max(
    WEBSOCKET_RECONNECT_INTERVAL_MIN,
    Math.min(Math.pow(2, attemptNumber) * 1_000, WEBSOCKET_RECONNECT_INTERVAL_MAX),
  )
}

const basePath: string = import.meta.env.VITE_JM_WEBSOCKET_ENDPOINT_PATH
const basePathWithoutLeadingSlash = basePath.replace(/^\//, '') // remove leading slash

const { protocol, host } = window.location
const scheme = protocol === 'https:' ? 'wss' : 'ws'
const url = `${scheme}://${host}/${basePathWithoutLeadingSlash}`

export const useJmWebsocket = () => {
  const authToken = useStore(authStore, (state) => state.state?.auth?.token)

  const [socketUrl] = useState(url)
  const [authSentAt, setAuthSentAt] = useState<Milliseconds>()
  const [authenticated, setAuthenticated] = useState(false)

  const websocket = useWebSocket(socketUrl, {
    share: true,
    /**
     * tl;dr. heartbeat functionality is done manually.
     * useWebSocket applies a default timeout for heartbeat
     * messages, but jm either either keeps connection open
     * after authentication or closes it on error.
     * therefore heartbeat requests will be done manually
     * without waiting for a response.
     */
    heartbeat: false,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: Infinity,
    reconnectInterval: (attemptNumber) => {
      const randomFactor = pseudoRandomFloat(0.8, 1.2)
      const value = Math.round(calcReconnectInterval(attemptNumber) * randomFactor)
      console.log(`Websocket reconnect attempt #${attemptNumber} in ${value}ms`)
      return value
    },
    onClose: () => {
      console.log('Websocket closed.')
      setAuthenticated(false)
    },
    onOpen: () => {
      console.log('Websocket opened.')
    },
  })

  const isOpen = useMemo(() => websocket.readyState === ReadyState.OPEN, [websocket.readyState])

  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (isOpen && authToken !== undefined) {
      timerId = setTimeout(() => {
        console.log('Renewing websocket authentication...')
        setAuthSentAt(Date.now())
        websocket.sendMessage(authToken)
      }, WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [websocket.sendMessage, authToken, isOpen])

  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (!isOpen || authSentAt === undefined) {
      timerId = setTimeout(() => {
        setAuthenticated(false)
      }, 4)
    } else {
      timerId = setTimeout(() => {
        console.log('Successfully renewed websocket authentication.')
        setAuthenticated(true)
      }, WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION)
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [isOpen, authSentAt])

  useEffect(
    function setupHeartbeat() {
      let timerId: NodeJS.Timeout
      const abortCtrl = new AbortController()
      if (isOpen && authenticated && authToken !== undefined) {
        const intervalRandomFactor = pseudoRandomFloat(0.75, 1.25)
        const interval = Math.round(WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL * intervalRandomFactor)
        console.log(`Setup heartbeat messages at interval ${interval}ms.`)
        timerId = setInterval(() => {
          const delayRandomFactor = pseudoRandomFloat(0.25, 0.75)
          const delay = Math.round(interval * delayRandomFactor)
          console.log(`Scheduled heartbeat message in ${delay}ms.`)
          setTimeout(() => {
            if (!abortCtrl.signal.aborted) {
              console.log('Sending heartbeat message...')
              websocket.sendMessage(authToken)
            }
          }, delay)
        }, interval)
      }
      return () => {
        console.log(`Cancelling scheduled heartbeat messages.`)
        abortCtrl.abort()
        if (timerId) {
          clearTimeout(timerId)
        }
      }
    },
    [websocket.sendMessage, isOpen, authenticated, authToken],
  )

  return {
    isOpen,
    isAuthenticated: isOpen && authenticated,
    ...websocket,
  }
}
