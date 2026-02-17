import { createStore } from 'zustand'

interface ConnectivityStoreState {
  browserOnline: boolean
  apiReachable: boolean
  updatedAt: number
  setBrowserOnline: (online: boolean) => void
  markApiReachable: () => void
  markApiUnreachable: () => void
}

const getInitialBrowserOnline = () => {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

export const connectivityStore = createStore<ConnectivityStoreState>()((set, get) => ({
  browserOnline: getInitialBrowserOnline(),
  apiReachable: true,
  updatedAt: Date.now(),
  setBrowserOnline: (online) => {
    const previous = get().browserOnline

    if (online === previous) {
      return
    }

    set(() => ({ browserOnline: online, updatedAt: Date.now() }))
  },
  markApiReachable: () => {
    if (get().apiReachable) {
      return
    }

    set(() => ({ apiReachable: true, updatedAt: Date.now() }))
  },
  markApiUnreachable: () => {
    if (!get().apiReachable) {
      return
    }

    set(() => ({ apiReachable: false, updatedAt: Date.now() }))
  },
}))

export const selectConnectionUnavailable = (state: ConnectivityStoreState) =>
  !state.browserOnline || !state.apiReachable
