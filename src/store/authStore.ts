import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UnlockWalletResponse } from '../lib/jm-api/generated/client'

type AuthState = {
  walletFileName?: string
  hashed_password?: string
  auth?: {
    token: UnlockWalletResponse['token']
    refresh_token: UnlockWalletResponse['refresh_token']
  }
}

interface AuthStoreState {
  state?: AuthState
  update: (val: Partial<AuthState>) => void
  clear: () => void
}

export const authStore = createStore<AuthStoreState>()(
  persist(
    (set, get) => ({
      state: {},
      update: (val) => set({ state: { ...(get().state || {}), ...val } }),
      clear: () => set({ state: undefined }),
    }),
    {
      name: 'jam-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
