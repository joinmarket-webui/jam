import { useEffect, useRef, useState } from 'react'
import { getrescaninfo } from '@/lib/jm-api/generated/client/sdk.gen'
import { setSession, type RescanSession } from '@/lib/session'
import { useApiClient } from './useApiClient'
import { useSession } from './useSession'

const RESCAN_PROGRESS_INTERVAL = 2000

export const useRescanStatus = () => {
  const session = useSession()
  const client = useApiClient()
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showCompletionMessage, setShowCompletionMessage] = useState(false)
  const [rescanInfo, setRescanInfo] = useState<RescanSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const walletFileName = session?.walletFileName

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

            setShowCompletionMessage(true)
            completionTimeoutRef.current = setTimeout(() => {
              setShowCompletionMessage(false)
            }, 3000)
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

  // Clear completion message if rescanning starts again
  useEffect(() => {
    if (session?.rescan?.rescanning && completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current)
      setShowCompletionMessage(false)
    }
  }, [session?.rescan?.rescanning])

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
      }
    }
  }, [])

  if (!walletFileName) {
    return {
      isRescanning: false,
      progress: 0,
      isLoading: false,
      rescanInfo: null,
      showCompletionMessage: false,
    }
  }

  return {
    isRescanning: session?.rescan?.rescanning || false,
    progress: session?.rescan?.progress,
    isLoading,
    rescanInfo,
    showCompletionMessage,
  }
}
