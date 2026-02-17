import { useEffect } from 'react'
import { connectivityStore } from '@/store/connectivityStore'

export const useConnectivitySync = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const setOnline = () => {
      connectivityStore.getState().setBrowserOnline(true)
      connectivityStore.getState().markApiReachable()
    }

    const setOffline = () => {
      connectivityStore.getState().setBrowserOnline(false)
    }

    connectivityStore.getState().setBrowserOnline(window.navigator.onLine)

    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)

    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])
}
