import { useEffect, useState } from 'react'
import { getSession } from '@/lib/session'

export const useSession = () => {
  const [session, setSessionState] = useState(getSession())

  useEffect(() => {
    // Listen for custom session update events
    const handleSessionUpdate = () => {
      setSessionState(getSession())
    }

    window.addEventListener('sessionUpdate', handleSessionUpdate)

    return () => {
      window.removeEventListener('sessionUpdate', handleSessionUpdate)
    }
  }, [])

  return session
}
