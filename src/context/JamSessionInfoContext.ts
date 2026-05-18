import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { SendFormValues } from '@/components/send/types'
import type { WalletFileName } from '@/lib/utils'

export interface RescanInfo {
  updatedAt: number
  rescanning: boolean
  progress?: number
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
}

interface JamSessionInfoContextType {
  blockHeight?: number
  takerInfo: TakerInfo
  rescanInfo: RescanInfo
  setRescanInfo: Dispatch<SetStateAction<RescanInfo>>
  setCurrentPaymentAttempt: (val: PaymentAttempt) => void
  clearCurrentPaymentAttempt: () => void
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
