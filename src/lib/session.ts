import type { UnlockWalletResponse } from '@/lib/jm-api/generated/client'

interface SessionData {
  walletFileName: string
  auth: {
    token: UnlockWalletResponse['token']
    refresh_token: UnlockWalletResponse['refresh_token']
  }
}

export const setSession = (session: Partial<SessionData>) => {
  sessionStorage.setItem(
    'joinmarket',
    JSON.stringify({
      ...(getSession() || {}),
      ...session,
    }),
  )
}

export const getSession = (): Partial<SessionData> | null => {
  const session = sessionStorage.getItem('joinmarket')
  return session ? JSON.parse(session) : null
}

export const clearSession = () => {
  sessionStorage.removeItem('joinmarket')
}
