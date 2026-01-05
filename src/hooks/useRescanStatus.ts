import { useMemo, useState } from 'react'
import { getrescaninfoOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useStore } from 'zustand'
import { JAM_RESCAN_PROGRESS_INTERVAL } from '@/constants/jam'
import { withQueryDelay } from '@/lib/queryClient'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useApiClient } from './useApiClient'

export interface RescanInfo {
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

  // only update rescan info if data is available and the current rescan info is younger than the latest data from the query
  // e.g. this prevents updating with stale data if components manually update it and want the query interval updater to refetch data later
  const shouldUpdateRescanInfo =
    getrescaninfoQuery.data &&
    (rescanInfo.updatedAt === undefined || rescanInfo.updatedAt < getrescaninfoQuery.dataUpdatedAt)

  if (shouldUpdateRescanInfo) {
    const isRescanning = getrescaninfoQuery.data.rescanning || jmSession.state?.rescanning === true
    const rescanningFinished = getrescaninfoQuery.data.rescanning === false && jmSession.state?.rescanning === true

    setRescanInfo({
      updatedAt: getrescaninfoQuery.dataUpdatedAt,
      rescanning: isRescanning,
      progress: rescanningFinished ? 100 : getrescaninfoQuery.data.progress,
    })
  }

  return {
    rescanInfo,
    setRescanInfo,
  }
}
