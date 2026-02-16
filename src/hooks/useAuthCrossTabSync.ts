import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { authStore, type AuthState } from '@/store/authStore'

const AUTH_SYNC_CHANNEL_NAME = 'jam:auth:sync'

type AuthStateRequestMessage = {
  type: 'auth_state_request'
  requestId: string
}

type AuthStateResponseMessage = {
  type: 'auth_state_response'
  requestId: string
  state: AuthState
}

type AuthClearedMessage = {
  type: 'auth_cleared'
}

type AuthSyncMessage = AuthStateRequestMessage | AuthStateResponseMessage | AuthClearedMessage

interface UseAuthCrossTabSyncProps {
  onRemoteAuthCleared: () => void
}

const createRequestId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

const hasValidAuthState = (state?: AuthState): state is AuthState =>
  state?.walletFileName !== undefined && state?.auth?.token !== undefined && state?.auth?.refresh_token !== undefined

const isAuthStateRequestMessage = (message: unknown): message is AuthStateRequestMessage =>
  !!message &&
  typeof message === 'object' &&
  'type' in message &&
  message.type === 'auth_state_request' &&
  'requestId' in message &&
  typeof message.requestId === 'string'

const isAuthStateResponseMessage = (message: unknown): message is AuthStateResponseMessage =>
  !!message &&
  typeof message === 'object' &&
  'type' in message &&
  message.type === 'auth_state_response' &&
  'requestId' in message &&
  typeof message.requestId === 'string' &&
  'state' in message

const isAuthClearedMessage = (message: unknown): message is AuthClearedMessage =>
  !!message && typeof message === 'object' && 'type' in message && message.type === 'auth_cleared'

const isAuthSyncMessage = (message: unknown): message is AuthSyncMessage =>
  isAuthStateRequestMessage(message) || isAuthStateResponseMessage(message) || isAuthClearedMessage(message)

export const broadcastAuthCleared = () => {
  if (typeof BroadcastChannel === 'undefined') {
    return
  }

  const authSyncChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME)
  authSyncChannel.postMessage({ type: 'auth_cleared' } satisfies AuthClearedMessage)
  authSyncChannel.close()
}

export const useAuthCrossTabSync = ({ onRemoteAuthCleared }: UseAuthCrossTabSyncProps) => {
  const hasAuthInCurrentTab = useStore(authStore, (state) => hasValidAuthState(state.state))
  const pendingRequestIdReference = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return
    }

    const authSyncChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME)

    const onMessage = (event: MessageEvent<unknown>) => {
      const { data: message } = event
      if (!isAuthSyncMessage(message)) {
        return
      }

      if (isAuthStateRequestMessage(message)) {
        const currentAuthState = authStore.getState().state
        if (!hasValidAuthState(currentAuthState)) {
          return
        }

        authSyncChannel.postMessage({
          type: 'auth_state_response',
          requestId: message.requestId,
          state: currentAuthState,
        } satisfies AuthStateResponseMessage)
        return
      }

      if (isAuthStateResponseMessage(message)) {
        if (pendingRequestIdReference.current === undefined) {
          return
        }

        if (message.requestId !== pendingRequestIdReference.current) {
          return
        }

        if (!hasValidAuthState(message.state)) {
          return
        }

        if (!hasValidAuthState(authStore.getState().state)) {
          authStore.getState().update(message.state)
        }

        pendingRequestIdReference.current = undefined
        return
      }

      onRemoteAuthCleared()
    }

    authSyncChannel.addEventListener('message', onMessage)

    if (!hasAuthInCurrentTab) {
      const requestId = createRequestId()
      pendingRequestIdReference.current = requestId
      authSyncChannel.postMessage({
        type: 'auth_state_request',
        requestId,
      } satisfies AuthStateRequestMessage)
    } else {
      pendingRequestIdReference.current = undefined
    }

    return () => {
      authSyncChannel.removeEventListener('message', onMessage)
      authSyncChannel.close()
    }
  }, [hasAuthInCurrentTab, onRemoteAuthCleared])
}
