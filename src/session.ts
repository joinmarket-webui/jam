import { WalletName, ApiAuthContext } from './libs/JmWalletApi'

const SESSION_KEY = 'joinmarket'

export interface SessionItem {
  name: WalletName
  auth: ApiAuthContext
}

export const setSession = (session: SessionItem) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

export const getSession = (): SessionItem | null => {
  const json = sessionStorage.getItem(SESSION_KEY)
  const { name, auth }: any = (json && JSON.parse(json)) || {}
  if (name && auth?.token) {
    return { name, auth }
  } else {
    clearSession()
    return null
  }
}

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY)
