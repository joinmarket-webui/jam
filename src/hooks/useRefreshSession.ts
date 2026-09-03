import { useEffect } from 'react'
import { sessionOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { useJamSession } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { Milliseconds } from '@/types/global'

export interface UseRefreshSessionProps {
  enabled: boolean
  refetchInterval: Milliseconds
  refetchDelay?: Milliseconds
}

export interface UseRefreshSessionResult {
  data?: SessionResponse
}

export function useRefreshSession({
  enabled,
  refetchInterval,
  refetchDelay = 1,
}: UseRefreshSessionProps): UseRefreshSessionResult {
  const client = useApiClient()
  const { updateSessionInfo } = useJamSession()
  const authState = useStore(authStore, (state) => state.state)
  const sessionOptionsQueryOptions = sessionOptions({
    client,
  })

  const { data: sessionData, refetch: refetchSessionData } = useQuery({
    ...sessionOptionsQueryOptions,
    queryFn: withQueryDelay(sessionOptionsQueryOptions.queryFn, {
      delayBefore: refetchDelay,
    }),
    enabled,
    retry: 3,
    staleTime: 1,
    gcTime: 1,
    refetchInterval,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (sessionData) {
      updateSessionInfo(sessionData)
    }
  }, [sessionData, updateSessionInfo])

  useEffect(
    function refetchOnWalletLockOrUnlock() {
      const abortCtrl = new AbortController()
      refetchSessionData().catch(() => {
        if (abortCtrl.signal.aborted) return
        const isDevMode = jamSettingsStore.getState().state.developerMode
        if (isDevMode) {
          toast.error(`[DEV] Error while refreshing session data.`, {
            id: 'jm-session-refresh-error',
          })
        }
      })
      return () => abortCtrl.abort()
    },
    [authState?.walletFileName, refetchSessionData],
  )

  return {
    data: sessionData,
  }
}
