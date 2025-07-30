import { useEffect, useState } from 'react'
import { getrescaninfo } from '@/lib/jm-api/generated/client/sdk.gen'
import { setSession, type RescanSession } from '@/lib/session'
import { useApiClient } from './useApiClient'
import { useSession } from './useSession'

const RESCAN_PROGRESS_INTERVAL = 2000

interface useRescanStatusProps {
  walletFileName: string
}

export const useRescanStatus = ({ walletFileName }: useRescanStatusProps) => {
  const session = useSession()
  const client = useApiClient()
  const [rescanInfo, setRescanInfo] = useState<RescanSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!session?.rescan?.rescanning || !walletFileName) {
      setRescanInfo(null)
      return
    }

    setRescanInfo(null)
    setIsLoading(true)

    const abortCtrl = new AbortController()

    const fetchRescanProgress = async (): Promise<void> => {
      try {
        const { data } = await getrescaninfo({
          client,
          path: { walletname: walletFileName },
          signal: abortCtrl.signal,
        })

        if (!abortCtrl.signal.aborted && data) {
          setRescanInfo(data)
          setIsLoading(false)

          // If API says rescanning is false but session still has rescanning true,
          // it means rescan completed
          if (!data.rescanning && session?.rescan?.rescanning) {
            setSession({
              rescan: {
                rescanning: false,
                progress: data.progress || 100,
              },
            })
          } else if (data.rescanning && data.progress !== session?.rescan?.progress) {
            setSession({
              rescan: {
                rescanning: session?.rescan?.rescanning || true,
                progress: data.progress,
              },
            })
          }
        }
      } catch (err) {
        if (!abortCtrl.signal.aborted) {
          console.warn('Error fetching rescan progress:', err)
          setIsLoading(false)
          setRescanInfo(null)
        }
      }
    }

    fetchRescanProgress()

    const interval = setInterval(fetchRescanProgress, RESCAN_PROGRESS_INTERVAL)

    return () => {
      clearInterval(interval)
      abortCtrl.abort()
    }
  }, [session?.rescan?.rescanning, walletFileName, client, session?.rescan?.progress])

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
