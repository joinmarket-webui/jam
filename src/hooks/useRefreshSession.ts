import { sessionOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useJamSessionInfoContext } from '@/context/JamSessionInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { withQueryDelay } from '@/lib/queryClient'
import type { Milliseconds } from '@/types/global'

export interface UseRefreshSessionProps {
  enabled: boolean
  refetchInterval: Milliseconds
  refetchDelay?: Milliseconds
}

export interface UseRefreshSessionResult {
  data?: SessionResponse
}

/**
 * Temporarily refresh the session more often than the default interval.
 * The query is shared with `JamSessionInfoContextProvider` (same query key),
 * which takes care of propagating the result to the session store.
 */
export function useRefreshSession({
  enabled,
  refetchInterval,
  refetchDelay = 1,
}: UseRefreshSessionProps): UseRefreshSessionResult {
  const client = useApiClient()
  const { jmSession } = useJamSessionInfoContext()
  const sessionQueryOptions = sessionOptions({
    client,
  })

  useQuery({
    ...sessionQueryOptions,
    queryFn: withQueryDelay(sessionQueryOptions.queryFn, {
      delayBefore: refetchDelay,
    }),
    enabled,
    retry: 3,
    staleTime: 1,
    gcTime: 1,
    refetchInterval,
    refetchIntervalInBackground: true,
  })

  return {
    data: jmSession,
  }
}
