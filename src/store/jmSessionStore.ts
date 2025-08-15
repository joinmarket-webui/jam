import { createStore } from 'zustand'
import type { SessionResponse } from '../lib/jm-api/generated/client'

interface JmSessionStoreState {
  state?: SessionResponse
  update: (val: SessionResponse) => void
}

export const jmSessionStore = createStore<JmSessionStoreState>()((set) => ({
  state: undefined,
  update: (val) => set((state) => ({ state: { ...(state.state || {}), ...val } })),
}))
