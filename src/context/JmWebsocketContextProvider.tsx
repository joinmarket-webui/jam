import type { PropsWithChildren } from 'react'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { jmTxStore, type JmTxInfo } from '@/store/jmTxStore'
import { JmWebsocketContext } from './JmWebsocketContext'

type JmTxWebsocketMessage = { txid: string; txdetails: JmTxInfo }
function isJmTxWebsocketMessage(val: unknown): val is JmTxWebsocketMessage {
  return (
    !!val &&
    typeof val === 'object' &&
    'txid' in val &&
    typeof val['txid'] === 'string' &&
    val['txid']?.length === 64 &&
    'txdetails' in val &&
    typeof val['txdetails'] === 'object' &&
    !!val['txdetails'] &&
    'txid' in val['txdetails'] &&
    typeof val['txdetails']['txid'] === 'string' &&
    val['txdetails']?.['txid'] === val['txid'] &&
    true
  )
}

const onWebsocketMessage = (message: unknown) => {
  if (isJmTxWebsocketMessage(message)) {
    jmTxStore.getState().add(message.txdetails)
  }
}

interface JmWebsocketContextType {
  blockHeight?: number
}

export const JmWebsocketContextProvider = ({ children }: PropsWithChildren<JmWebsocketContextType>) => {
  const websocket = useJmWebsocket({
    config: {
      enableHeartbeat: true,
      enableAuthentication: true,
    },
    options: {
      onMessage(messageEvent) {
        const message: unknown = (() => {
          try {
            return messageEvent?.data ? (JSON.parse(String(messageEvent.data)) as unknown) : undefined
          } catch (_ignoredOnPurpose) {
            console.warn('Error parsing websocket message', messageEvent.data)
            return undefined
          }
        })()

        if (message !== undefined && message !== null) {
          onWebsocketMessage(message)
        }
      },
    },
  })

  const value = {
    websocket,
  }

  return <JmWebsocketContext.Provider value={value}>{children}</JmWebsocketContext.Provider>
}
