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

interface JamSessionInfoContextType {
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

export const useJamSession = () => {
  const { jmSession, updateSessionInfo } = useJamSessionInfoContext()
  return { jmSession, updateSessionInfo }
}
