import { useState } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'

const basePath: string = import.meta.env.VITE_JM_WEBSOCKET_ENDPOINT_PATH
const basePathWithoutLeadingSlash = basePath.replace(/^\//, '') // remove leading slash

const { protocol, host } = window.location
const scheme = protocol === 'https:' ? 'wss' : 'ws'
const url = `${scheme}://${host}/${basePathWithoutLeadingSlash}`

export const useJmWebsocket = () => {
  const [socketUrl] = useState(url)
  const [authenticated] = useState(false)
  const websocket = useWebSocket(socketUrl, { share: true })

  return {
    isOpen: websocket.readyState === ReadyState.OPEN,
    isAuthenticated: authenticated,
    ...websocket,
  }
}
