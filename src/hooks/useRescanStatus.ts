import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { JAM_RESCAN_PROGRESS_INTERVAL } from '@/constants/jam'
import { getrescaninfoOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { withQueryDelay } from '@/lib/queryClient'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useApiClient } from './useApiClient'

interface RescanInfo {
  updatedAt: number
  rescanning: boolean
  progress?: number
}

interface UseRescanStatusProps {
  walletFileName: string
}

export const useRescanStatus = ({ walletFileName }: UseRescanStatusProps) => {
  const jmSession = useStore(jmSessionStore, (state) => state)
  const client = useApiClient()
  const [rescanInfo, setRescanInfo] = useState<RescanInfo>({
    updatedAt: 0,
    rescanning: jmSession.state?.rescanning === true,
  })

  const getrescaninfoQueryOptions = useMemo(
    () =>
      getrescaninfoOptions({
        client,
        path: { walletname: walletFileName },
      }),
    [client, walletFileName],
  )

  const getrescaninfoQuery = useQuery({
    ...getrescaninfoQueryOptions,
    queryFn: withQueryDelay(getrescaninfoQueryOptions.queryFn, 1_000),
    refetchInterval: JAM_RESCAN_PROGRESS_INTERVAL,
    refetchIntervalInBackground: true,
    enabled: rescanInfo.rescanning || jmSession.state?.rescanning === true,
  })

  useEffect(() => {
    if (getrescaninfoQuery.data) {
      const rescanningFinished = getrescaninfoQuery.data.rescanning === false && jmSession.state?.rescanning === true

      setRescanInfo({
        updatedAt: getrescaninfoQuery.dataUpdatedAt,
        rescanning: getrescaninfoQuery.data.rescanning || jmSession.state?.rescanning === true,
        progress: rescanningFinished ? 100 : getrescaninfoQuery.data.progress,
      })
    }
  }, [jmSession.state?.rescanning, getrescaninfoQuery.data, getrescaninfoQuery.dataUpdatedAt])

  return {
    rescanInfo,
    setRescanInfo,
  }
}
