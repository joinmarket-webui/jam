import { versionOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '@/hooks/useApiClient'
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
