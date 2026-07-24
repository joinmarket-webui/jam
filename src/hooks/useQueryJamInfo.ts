import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useQueryJmInfo } from '@/hooks/useQueryJmInfo'
import { fetchInfo, type JamInfoResponse } from '@/lib/api/jam'
import { parseSemanticVersion, UNKNOWN_VERSION, type SemanticVersion } from '@/lib/utils'
import { authStore } from '@/store/authStore'

export type UseQueryJamInfoResult = {
  backendName?: string
  backendVersion: SemanticVersion
}

export function useQueryJamInfo(): UseQueryJamInfoResult {
  const token = useStore(authStore, (state) => state.state?.auth?.token)

  const { data: standaloneInfo } = useQuery({
    queryKey: ['jam-info'],
    queryFn: async ({ signal }) => {
      if (token === undefined) {
        throw new Error('No authentication token available')
      }
      const response = await fetchInfo({
        token,
        signal,
      })

      if (!response.ok) {
        throw new Error('Jam info request failed')
      }

      return (await response.json()) as JamInfoResponse
    },
    enabled: token !== undefined,
    retry: false,
  })
  const { info: backendInfo } = useQueryJmInfo()

  const result = useMemo(() => {
    if (!standaloneInfo && !backendInfo) {
      return {
        backendVersion: UNKNOWN_VERSION,
      }
    }

    const standaloneVersion = standaloneInfo && parseSemanticVersion(standaloneInfo.backend.version)
    const standaloneName = standaloneInfo && `jam-standalone (${standaloneInfo.backend.name})`

    return {
      backendName: standaloneName ?? backendInfo?.backend,
      backendVersion: standaloneVersion ?? backendInfo?.version ?? UNKNOWN_VERSION,
    }
  }, [standaloneInfo, backendInfo])

  return result
}
