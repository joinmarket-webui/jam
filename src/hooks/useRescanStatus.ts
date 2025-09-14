import { useCallback, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { JAM_RESCAN_PROGRESS_INTERVAL } from '@/constants/jam'
import type { RescanInfoResponse } from '@/lib/jm-api/generated/client'
import { getrescaninfo } from '@/lib/jm-api/generated/client/sdk.gen'
import { setIntervalDebounced } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useApiClient } from './useApiClient'

interface RescanInfo {
  rescanning: boolean
  progress?: number
}

interface useRescanStatusProps {
  walletFileName: string
}

export const useRescanStatus = ({ walletFileName }: useRescanStatusProps) => {
  const jmSession = useStore(jmSessionStore, (state) => state)
  const client = useApiClient()
  const [rescanInfo, setRescanInfo] = useState<RescanInfo>({
    rescanning: !!jmSession.state?.rescanning,
  })
  const [isLoading, setIsLoading] = useState(false)

  /*const getrescaninfoQuery = useQuery({
    ...getrescaninfoOptions({ 
      client,
      path: { walletname: walletFileName },
    }),
    refetchInterval: JAM_RESCAN_PROGRESS_INTERVAL,
    refetchIntervalInBackground: true,
    enabled: rescanInfo.rescanning,
  })

  useEffect(() => {
    console.debug('getrescaninfoQuery.data changed', getrescaninfoQuery.data)
    if (getrescaninfoQuery.data) {
      setRescanInfo(getrescaninfoQuery.data)
    }
  }, [getrescaninfoQuery.data])*/

  const refetch = useCallback(
    (signal: AbortSignal) => {
      const fetchRescanProgress = async (): Promise<RescanInfoResponse | undefined> => {
        try {
          setIsLoading(true)
          const { data } = await getrescaninfo({
            client,
            path: { walletname: walletFileName },
            signal: signal,
          })

          if (!signal.aborted) {
            return data
          }
        } catch (err) {
          if (!signal.aborted) {
            console.warn('Error fetching rescan progress:', err)
            setIsLoading(false)
            throw err
          }
        }
      }

      console.debug('Fetching rescan progress...')
      return fetchRescanProgress().then((data) => {
        console.debug('Fetched rescan progress', data)
        if (data) {
          setRescanInfo(data)
        }
        return data
      })
    },
    [walletFileName],
  )

  useEffect(() => {
    if (!walletFileName) {
      setRescanInfo({
        rescanning: false,
      })
      return
    }

    const abortCtrl = new AbortController()
    console.debug('Starting rescan progress interval', JAM_RESCAN_PROGRESS_INTERVAL)
    let interval: NodeJS.Timeout
    setIntervalDebounced(
      async () => {
        refetch(abortCtrl.signal).then((data) => {
          if (data && data.rescanning !== true) {
            console.debug('Stopping rescan progress interval')
            clearInterval(interval)
          }
        })
      },
      JAM_RESCAN_PROGRESS_INTERVAL,
      (timerId) => (interval = timerId),
    )

    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [rescanInfo.rescanning, jmSession.state?.rescanning, walletFileName, client, refetch])

  if (!walletFileName) {
    return {
      isLoading: false,
      rescanInfo,
      setRescanInfo,
    }
  }

  return {
    isLoading,
    rescanInfo,
    setRescanInfo,
  }
}
