import { useMemo } from 'react'
import { versionOptions } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import type { GetInfoResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { parseSemanticVersion, type SemanticVersion } from '@/lib/utils'

type UseQueryJmInfoResult = {
  info?: Omit<GetInfoResponse, 'version'> & {
    version: SemanticVersion
  }
}

export function useQueryJmInfo(): UseQueryJmInfoResult {
  const client = useApiClient()

  const queryResult = useQuery({
    ...versionOptions({ client }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  const result = useMemo(() => {
    return queryResult.data === undefined
      ? {}
      : {
          info: {
            ...queryResult.data,
            version: parseSemanticVersion(queryResult.data.version),
          },
        }
  }, [queryResult.data])

  return result
}
