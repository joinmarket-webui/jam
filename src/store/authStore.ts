import type { UnlockWalletResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { createStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { JM_API_AUTH_TOKEN_EXPIRY } from '@/constants/jm'
import type { WalletFileName } from '@/lib/utils'
import type { Milliseconds } from '@/types/global'

export type AuthState = {
  walletFileName?: WalletFileName
  hashed_password?: string
  auth?: {
    token: UnlockWalletResponse['token']
    refresh_token: UnlockWalletResponse['refresh_token']
    expiresAt: Milliseconds
  }
}

export const computeAuthExpiresAt = (expiresInSeconds: number | undefined): Milliseconds => {
  const lifetimeMs =
    typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? expiresInSeconds * 1_000
      : JM_API_AUTH_TOKEN_EXPIRY
  return Date.now() + lifetimeMs
}

interface AuthStoreState {
  state?: AuthState
  update: (val: Partial<AuthState>) => void
  clear: () => void
}

export const authStore = createStore<AuthStoreState>()(
  persist(
    (set) => ({
      state: undefined,
      update: (val) => set((state) => ({ state: { ...state.state, ...val } })),
      clear: () => set({ state: undefined }),
    }),
    {
      name: 'jam-auth-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
