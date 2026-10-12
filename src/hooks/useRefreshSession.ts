import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useJamSessionInfoContext } from '@/context/JamSessionInfoContext'
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
  const { refetchSessionData } = useJamSessionInfoContext()

  const { data: sessionData } = useQuery({
    queryKey: ['refresh-session', enabled, refetchInterval, refetchDelay],
    queryFn: async () => {
      return await refetchSessionData()
    },
    enabled,
    retry: 3,
    staleTime: 1,
    gcTime: 1,
    refetchInterval,
    refetchIntervalInBackground: true,
  })

  return {
    data: sessionData?.data,
  }
}
