import type { UnlockWalletResponse } from '@/lib/jm-api/generated/client'

interface SessionData {
  walletFileName: string
  auth: {
    token: UnlockWalletResponse['token']
    refresh_token: UnlockWalletResponse['refresh_token']
  }
}

// Function to save session after successful login
export const setSession = (session: Partial<SessionData>) => {
  sessionStorage.setItem(
    'joinmarket',
    JSON.stringify({
      ...(getSession() || {}),
      ...session,
    }),
  )
}

// Function to get current session
export const getSession = (): Partial<SessionData> | null => {
  const session = sessionStorage.getItem('joinmarket')
  return session ? JSON.parse(session) : null
}

// Function to clear session on logout
export const clearSession = () => {
  sessionStorage.removeItem('joinmarket')
}
