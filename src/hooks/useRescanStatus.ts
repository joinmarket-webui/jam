import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getrescaninfoOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { setSession } from '@/lib/session'
import { useApiClient } from './useApiClient'
import { useSession } from './useSession'

export const useRescanStatus = () => {
  const session = useSession()
  const client = useApiClient()

  const walletFileName = session?.walletFileName

  const { data: rescanInfo, isLoading } = useQuery({
    ...getrescaninfoOptions({
      client,
      path: { walletname: walletFileName || '' },
    }),
    enabled: !!walletFileName,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (rescanInfo && session?.rescan?.rescanning !== rescanInfo.rescanning) {
      setSession({
        rescan: {
          rescanning: rescanInfo.rescanning,
          progress: rescanInfo.progress,
        },
      })
    }
  }, [rescanInfo, session?.rescan?.rescanning])

  if (!walletFileName) {
    return {
      isRescanning: false,
      progress: 0,
      isLoading: false,
      rescanInfo: null,
    }
  }

  return {
    isRescanning: session?.rescan?.rescanning || false,
    progress: session?.rescan?.progress,
    isLoading,
    rescanInfo,
  }
}
