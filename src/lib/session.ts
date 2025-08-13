export interface RescanSession {
  rescanning: boolean
  progress?: number
}

interface SessionData {
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

// Dispatch custom event to notify components of session change
function dispatchEvent(eventName: string) {
  window.dispatchEvent(new CustomEvent(eventName))
}
