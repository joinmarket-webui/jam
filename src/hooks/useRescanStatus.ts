import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getrescaninfoOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { setSession } from '@/lib/session'
import { useApiClient } from './useApiClient'
import { useSession } from './useSession'

export const useRescanStatus = () => {
  const session = useSession()
  const client = useApiClient()
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showCompletionMessage, setShowCompletionMessage] = useState(false)
  const [wasRescanning, setWasRescanning] = useState(false)

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
    if (rescanInfo) {
      if (rescanInfo.rescanning !== session?.rescan?.rescanning) {
        setSession({
          rescan: {
            rescanning: rescanInfo.rescanning,
            progress: rescanInfo.progress,
          },
        })
      }

      if (wasRescanning && !rescanInfo.rescanning) {
        setShowCompletionMessage(true)

        completionTimeoutRef.current = setTimeout(() => {
          setShowCompletionMessage(false)
        }, 3000)
      }

      setWasRescanning(rescanInfo.rescanning)

      // Clear completion message if rescanning starts again
      if (rescanInfo.rescanning && completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
        setShowCompletionMessage(false)
      }
    }
  }, [rescanInfo, session?.rescan?.rescanning, wasRescanning])

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
