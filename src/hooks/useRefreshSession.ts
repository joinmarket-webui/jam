import { useEffect, useMemo } from 'react'
import { sessionOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
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
  const authState = useStore(authStore, (state) => state.state)
  const sessionOptionsQueryOptions = useMemo(
    () =>
      sessionOptions({
        client,
      }),
    [client],
  )

  const { data: sessionData, refetch: refetchSessionData } = useQuery({
    ...sessionOptionsQueryOptions,
    queryFn: withQueryDelay(sessionOptionsQueryOptions.queryFn, {
      delayBefore: refetchDelay,
    }),
    enabled,
    retry: 3,
    staleTime: 0,
    refetchInterval,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (sessionData) {
      jmSessionStore.getState().update(sessionData)

      const isDevMode = jamSettingsStore.getState().state.developerMode
      if (isDevMode) {
        toast.info(`[DEV] Successfully refreshed session data.`, {
          id: 'jm-session-refresh-success',
        })
      }
    }
  }, [sessionData])

  useEffect(
    function refetchOnWalletLockOrUnlock() {
      refetchSessionData().catch(() => {
        const isDevMode = jamSettingsStore.getState().state.developerMode
        if (isDevMode) {
          toast.error(`[DEV] Error while refreshing session data.`)
        }
      })
    },
    [authState?.walletFileName, refetchSessionData],
  )

  return {
    data: sessionData,
  }
}
