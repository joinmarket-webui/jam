import { versionOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage, VersionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { parseSemanticVersion, type SemanticVersion } from '@/lib/utils'

type UseQueryJmInfoResult = {
  version: SemanticVersion | undefined
  queryResult: UseQueryResult<VersionResponse, ErrorMessage>
}

export function useQueryJmInfo(): UseQueryJmInfoResult {
  const client = useApiClient()

  const queryResult = useQuery({
    ...versionOptions({ client }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  return {
    version: queryResult.data ? parseSemanticVersion(queryResult.data.version) : undefined,
    queryResult,
  }
}
