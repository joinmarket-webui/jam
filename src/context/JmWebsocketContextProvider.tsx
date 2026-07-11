import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useJmWebsocket } from '@/hooks/useJmWebsocket'
import { shortenStringMiddle } from '@/lib/utils'
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

const onWebsocketMessage = (message: unknown, onNewTx: (tx: JmTxInfo) => void) => {
  if (isJmTxWebsocketMessage(message)) {
    // txs made via the ui are added to the store before the websocket
    // echoes them, so an unknown txid means an external tx (e.g. earn, deposit)
    const isKnownTx = jmTxStore.getState().get(message.txid) !== undefined
    jmTxStore.getState().add(message.txdetails)
    if (!isKnownTx) {
      onNewTx(message.txdetails)
    }
  }
}

interface JmWebsocketContextType {
  blockHeight?: number
}

export const JmWebsocketContextProvider = ({ children }: PropsWithChildren<JmWebsocketContextType>) => {
  const { t } = useTranslation()
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
          onWebsocketMessage(message, (tx) => {
            toast.info(t('app.alert_new_transaction', { txid: shortenStringMiddle(tx.txid) }))
          })
        }
      },
    },
  })

  const value = {
    websocket,
  }

  return <JmWebsocketContext.Provider value={value}>{children}</JmWebsocketContext.Provider>
}
