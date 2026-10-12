import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { SessionResponse, TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query'
import type { SendFormValues } from '@/components/send/types'
import type { WalletFileName } from '@/lib/utils'
import type { Factor } from '@/types/global'

export interface RescanInfo {
  updatedAt: number
  rescanning: boolean
  progress?: Factor
  progressInPercentage?: string
}

export interface PaymentAttempt {
  createdAt: number
  utxosHashHex: string
  walletFileName: WalletFileName
  data: SendFormValues
}

type TakerStatus =
  | 'fetching_orderbook'
  | 'filling'
  | 'authenticating'
  | 'collecting_signatures'
  | 'broadcasting'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | TakerStatusResponse['status']

export interface TakerInfo {
  running: boolean
  status: {
    value: TakerStatus
    idle: boolean
    fetchingOrderbook: boolean
    filling: boolean
    authenticating: boolean
    collectingSignatures: boolean
    broadcasting: boolean
    completed: boolean
    failed: boolean
    cancelled: boolean
  }
  __raw?: TakerStatusResponse
  currentPaymentAttempt?: PaymentAttempt
  // move to own "schedulerInfo"
  scheduler: {
    running: boolean
  }
}

export interface MakerInfo {
  running: boolean
}

interface JamSessionInfoContextType {
  blockHeight?: number
  takerInfo: TakerInfo
  rescanInfo: RescanInfo
  makerInfo: MakerInfo
  jmSession?: SessionResponse
  setRescanInfo: Dispatch<SetStateAction<RescanInfo>>
  setCurrentPaymentAttempt: (val: PaymentAttempt) => void
  clearCurrentPaymentAttempt: () => void
  refetchSessionData: (options?: RefetchOptions) => Promise<QueryObserverResult<SessionResponse, Error>>
  updateSessionInfo: (val: SessionResponse) => void
}

export const JamSessionInfoContext = createContext<JamSessionInfoContextType | undefined>(undefined)

export const useJamSessionInfoContext = () => {
  const context = useContext(JamSessionInfoContext)
  if (context === undefined) {
    throw new Error('useJamSessionInfoContext must be used within a JamSessionInfoContextProvider')
  }
  return context
}

export const useRescanStatus = () => {
  const { rescanInfo, setRescanInfo } = useJamSessionInfoContext()
  return { rescanInfo, setRescanInfo }
}

export const useCurrentBlockHeight = () => {
  const { blockHeight } = useJamSessionInfoContext()
  return { currentBlockHeight: blockHeight }
}

// TODO: The generic session response (`jmSession`) is a temporary abstraction.
// It should eventually be replaced with custom, domain-specific structures
// (e.g. TakerInfo, MakerInfo, RescanInfo, etc.) and this hook removed.
export const useRawJmSession = () => {
  const { jmSession, updateSessionInfo } = useJamSessionInfoContext()
  return { jmSession, updateSessionInfo }
}
