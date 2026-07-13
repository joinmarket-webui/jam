import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { useQueryJmInfo } from '@/hooks/useQueryJmInfo'
import { fetchInfo, type JamInfoResponse } from '@/lib/api/jam'
import { parseSemanticVersion, type SemanticVersion } from '@/lib/utils'
import { authStore } from '@/store/authStore'

export type UseQueryJamInfoResult = {
  info: JamInfoResponse | undefined
  isJamStandalone: boolean
  backendName: string | undefined
  joinmarketVersion: SemanticVersion | undefined
  queryResult: UseQueryResult<JamInfoResponse, unknown>
}

export function useQueryJamInfo(): UseQueryJamInfoResult {
  const token = useStore(authStore, (state) => state.state?.auth?.token)

  const queryResult = useQuery({
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

  const jamInfo = queryResult.data
  const { version: nativeJoinmarketVersion, backend: nativeBackendName } = useQueryJmInfo()

  const standaloneJoinmarketVersion = jamInfo?.backend.version
    ? parseSemanticVersion(jamInfo.backend.version)
    : undefined
  const hasStandaloneBackendVersion =
    standaloneJoinmarketVersion?.raw !== undefined && standaloneJoinmarketVersion.raw !== 'unknown'
  const isJamStandalone = jamInfo?.backend !== undefined

  const backendName = isJamStandalone ? `jam-standalone (${jamInfo.backend.name})` : nativeBackendName

  const joinmarketVersion =
    isJamStandalone && hasStandaloneBackendVersion ? standaloneJoinmarketVersion : nativeJoinmarketVersion

  return {
    info: jamInfo,
    isJamStandalone,
    backendName,
    joinmarketVersion,
    queryResult,
  }
}
