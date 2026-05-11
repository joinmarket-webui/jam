import { createContext, useContext } from 'react'
import type { JmWebsocket } from '@/hooks/useJmWebsocket'

interface JmWebsocketContextType {
  websocket: JmWebsocket
}

export const JmWebsocketContext = createContext<JmWebsocketContextType | undefined>(undefined)

export const useJmWebsocketContext = () => {
  const context = useContext(JmWebsocketContext)
  if (context === undefined) {
    throw new Error('useJmWebsocketContext must be used within a JmWebsocketContextProvider')
  }
  return context
}
