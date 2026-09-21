import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
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

export interface TakerInfo {
  currentPaymentAttempt?: PaymentAttempt
  running: boolean
  scheduler: {
    running: boolean
  }
}

export interface MakerInfo {
  running: boolean
}

interface JmSessionInfoContextType {
  blockHeight?: number
  takerInfo: TakerInfo
  rescanInfo: RescanInfo
  makerInfo: MakerInfo
  jmSession?: SessionResponse
  setRescanInfo: Dispatch<SetStateAction<RescanInfo>>
  setCurrentPaymentAttempt: (val: PaymentAttempt) => void
  clearCurrentPaymentAttempt: () => void
  updateSessionInfo: (val: SessionResponse) => void
}

export const JmSessionInfoContext = createContext<JmSessionInfoContextType | undefined>(undefined)

export const useJmSessionInfoContext = () => {
  const context = useContext(JmSessionInfoContext)
  if (context === undefined) {
    throw new Error('useJmSessionInfoContext must be used within a JmSessionInfoContextProvider')
  }
  return context
}

export const useRescanStatus = () => {
  const { rescanInfo, setRescanInfo } = useJmSessionInfoContext()
  return { rescanInfo, setRescanInfo }
}

export const useCurrentBlockHeight = () => {
  const { blockHeight } = useJmSessionInfoContext()
  return { currentBlockHeight: blockHeight }
}

// TODO: The generic session response (`jmSession`) is a temporary abstraction.
// It should eventually be replaced with custom, domain-specific structures
// (e.g. TakerInfo, MakerInfo, RescanInfo, etc.) and this hook removed.
export const useJmSession = () => {
  const { jmSession, updateSessionInfo } = useJmSessionInfoContext()
  return { jmSession, updateSessionInfo }
}
