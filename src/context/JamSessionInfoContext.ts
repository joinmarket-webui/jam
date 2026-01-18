import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'

export interface RescanInfo {
  updatedAt: number
  rescanning: boolean
  progress?: number
}

interface JamSessionInfoContextType {
  rescanInfo: RescanInfo
  setRescanInfo: Dispatch<SetStateAction<RescanInfo>>
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
