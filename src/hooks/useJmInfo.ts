import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
import { versionOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { toSemVer } from '@/lib/utils'

export const useJmInfo = () => {
  const client = useApiClient()

  const { data, isPending } = useQuery({
    ...versionOptions({ client }),
    staleTime: Infinity,
  })

  return {
    version: data ? toSemVer(data.version) : undefined,
    isLoading: isPending,
  }
}
