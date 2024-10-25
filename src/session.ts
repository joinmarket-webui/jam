import { TokenResponse, WalletFileName } from './libs/JmWalletApi'

const SESSION_KEY = 'joinmarket'

export interface SessionItem {
  walletFileName: WalletFileName
  auth: TokenResponse
}

export const setSession = (session: SessionItem) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

export const getSession = (): SessionItem | null => {
  const json = sessionStorage.getItem(SESSION_KEY)
  const { walletFileName, auth }: any = (json && JSON.parse(json)) || {}
  if (walletFileName && auth?.token) {
    return { walletFileName, auth }
  } else {
    clearSession()
    return null
  }
}

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY)
