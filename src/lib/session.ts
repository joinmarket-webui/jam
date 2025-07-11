import type { UnlockWalletResponse } from '@/lib/jm-api/generated/client'

export interface RescanSession {
  rescanning: boolean
  progress?: number
}

interface SessionData {
  walletFileName: string
  auth: {
    token: UnlockWalletResponse['token']
    refresh_token: UnlockWalletResponse['refresh_token']
  }
  rescan?: RescanSession
}

export const setSession = (session: Partial<SessionData>) => {
  sessionStorage.setItem(
    'joinmarket',
    JSON.stringify({
      ...(getSession() || {}),
      ...session,
    }),
  )

  dispatchEvent('sessionUpdate')
}

export const getSession = (): Partial<SessionData> | null => {
  const session = sessionStorage.getItem('joinmarket')
  return session ? JSON.parse(session) : null
}

export const clearSession = () => {
  sessionStorage.removeItem('joinmarket')

  dispatchEvent('sessionUpdate')
}

// Dispatch custom event to notify components of session change
function dispatchEvent(eventName: string) {
  window.dispatchEvent(new CustomEvent(eventName))
}
