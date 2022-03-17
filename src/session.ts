const SESSION_KEY = 'joinmarket'

export interface SessionItem {
  name: string
  token: string
}

export const setSession = (session: SessionItem) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

export const getSession = (): SessionItem | null => {
  const json = sessionStorage.getItem(SESSION_KEY)
  const { name, token }: any = (json && JSON.parse(json)) || {}
  if (name && token) {
    return { name, token }
  } else {
    clearSession()
    return null
  }
}

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY)
