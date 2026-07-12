import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { fetchInfo, type JamInfoResponse } from '@/lib/api/jam'
import { authStore } from '@/store/authStore'

export const useJamInfo = () => {
  const token = useStore(authStore, (state) => state.state?.auth?.token)

  const { data, error, isLoading, isFetching } = useQuery({
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

  return {
    info: data,
    error,
    isLoading,
    isFetching,
  }
}
