import { useEffect, useMemo, useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import type { WebSocketHook } from 'react-use-websocket/dist/lib/types'
import { useStore } from 'zustand'
import {
  JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION,
  JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION,
  JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL,
  JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX,
  JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN,
} from '@/constants/jam'
import { pseudoRandomFloat } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import type { Milliseconds } from '@/types/global'

const calcReconnectInterval = (attemptNumber: number): Milliseconds => {
  return Math.max(
    JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN,
    Math.min(Math.pow(2, attemptNumber) * 1_000, JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX),
  )
}

const basePath: string = import.meta.env.VITE_JM_WEBSOCKET_ENDPOINT_PATH
const basePathWithoutLeadingSlash = basePath.replace(/^\//, '') // remove leading slash

const { protocol, host } = window.location
const scheme = protocol === 'https:' ? 'wss' : 'ws'
const url = `${scheme}://${host}/${basePathWithoutLeadingSlash}`

export type JmWebsocket = Omit<WebSocketHook, 'sendMessage' | 'sendJsonMessage'> & {
  isOpen: boolean
  isAuthenticated: boolean
}

export const useJmWebsocket = (): JmWebsocket => {
  const authToken = useStore(authStore, (state) => state.state?.auth?.token)

  const [socketUrl] = useState(url)
  const [authSentAt, setAuthSentAt] = useState<Milliseconds>()
  const [authenticated, setAuthenticated] = useState(false)

  const { sendMessage, ...websocket } = useWebSocket(socketUrl, {
    share: true,
    /**
     * tl;dr: heartbeat functionality is done manually.
     * useWebSocket applies a default timeout for heartbeat
     * messages, but jm either keeps connection open
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
      console.debug(`Websocket reconnect attempt #${attemptNumber} in ${value}ms`)
      return value
    },
    onClose: () => {
      console.debug('Websocket closed.')
      setAuthenticated(false)
    },
    onOpen: () => {
      console.debug('Websocket opened.')
    },
  })

  const isOpen = useMemo(() => websocket.readyState === ReadyState.OPEN, [websocket.readyState])

  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (isOpen && authToken !== undefined) {
      timerId = setTimeout(() => {
        console.debug('Renewing websocket authentication...')
        setAuthSentAt(Date.now())
        sendMessage(authToken)
      }, JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    }
    return () => {
      clearTimeout(timerId)
    }
  }, [sendMessage, authToken, isOpen])

  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (!isOpen || authSentAt === undefined) {
      timerId = setTimeout(() => {
        setAuthenticated(false)
      }, 4)
    } else {
      timerId = setTimeout(() => {
        console.info('Successfully renewed websocket authentication.')
        setAuthenticated(true)
      }, JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION)
    }
    return () => {
      clearTimeout(timerId)
    }
  }, [isOpen, authSentAt])

  useEffect(
    function setupHeartbeat() {
      if (!isOpen || !authenticated || authToken === undefined) {
        return
      }

      const intervalRandomFactor = pseudoRandomFloat(0.75, 1.25)
      const interval = Math.round(JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL * intervalRandomFactor)
      console.debug(`Setup heartbeat messages at interval ${interval}ms.`)

      const abortCtrl = new AbortController()
      const timerId = setInterval(() => {
        const delayRandomFactor = pseudoRandomFloat(0.25, 0.75)
        const delay = Math.round(interval * delayRandomFactor)
        console.debug(`Scheduled heartbeat message in ${delay}ms.`)
        setTimeout(() => {
          if (abortCtrl.signal.aborted) {
            return
          }
          console.debug('Sending heartbeat message...')
          sendMessage(authToken)
        }, delay)
      }, interval)
      return () => {
        console.debug(`Cancelling scheduled heartbeat messages.`)
        abortCtrl.abort()
        clearTimeout(timerId)
      }
    },
    [sendMessage, isOpen, authenticated, authToken],
  )

  return {
    isOpen,
    isAuthenticated: isOpen && authenticated,
    ...websocket,
  }
}
