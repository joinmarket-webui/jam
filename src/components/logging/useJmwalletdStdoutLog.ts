import type { ComponentProps } from 'react'
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Alert } from '@/components/ui/alert'
import { JAM_BACKEND } from '@/constants/jam'
import { fetchLog } from '@/lib/api/jam'
import { getErrorReason } from '@/lib/errorReason'
import { authStore } from '@/store/authStore'

const LEGACY_JMWALLETD_LOG_FILE_NAMES = ['jmwalletd_stdout.log', 'jmwalletd/current'] as const
const STANDALONE_NG_LOG_FILE_NAMES = ['jmwalletd/current', 'jmwalletd_stdout.log'] as const

const getPreferredLogFileNames = () => {
  // Standalone-NG emits logs via the rolling "jmwalletd/current" file first.
  return JAM_BACKEND === 'jam-standalone-ng' ? STANDALONE_NG_LOG_FILE_NAMES : LEGACY_JMWALLETD_LOG_FILE_NAMES
}

type LogQueryData = {
  fileName: string
  content: string
}

interface SimpleAlert {
  variant: ComponentProps<typeof Alert>['variant']
  message: string
}

interface UseJmwalletdStdoutLogParameters {
  enabled?: boolean
}

export function useJmwalletdStdoutLog({ enabled = true }: UseJmwalletdStdoutLogParameters = {}) {
  const authState = useStore(authStore, (state) => state.state)
  const { t } = useTranslation()
  const token = authState?.auth?.token
  const preferredLogFileNames = getPreferredLogFileNames()

  const {
    refetch: logQueryRefetch,
    isFetched: logQueryIsFetched,
    data: logQueryData,
    error: logQueryError,
  } = useQuery<LogQueryData>({
    // Keep query identity stable across token refreshes to avoid flashing back to "loading".
    queryKey: ['logs', 'jmwalletd', preferredLogFileNames[0], ...preferredLogFileNames],
    enabled: enabled && token !== undefined,
    retry: false,
    refetchOnWindowFocus: false,
    // Poll logs continuously so users don't depend on manual refresh/token lifecycle.
    refetchInterval: (query) => {
      if (!enabled || token === undefined) return false
      if (query.state.error) return false
      return 2_500
    },
    // Keep previous data during refetch to prevent content flicker on slower networks.
    placeholderData: (previousData) => previousData,
    queryFn: async ({ signal }) => {
      if (token === undefined) return { fileName: preferredLogFileNames[0], content: '' }

      let lastNotFoundError: Error | undefined
      for (const fileName of preferredLogFileNames) {
        try {
          const response = await fetchLog({ token, fileName, signal })
          return { fileName, content: await response.text() }
        } catch (error) {
          if (error instanceof Error && error.message.includes('status 404')) {
            lastNotFoundError = error
            continue
          }
          throw error
        }
      }

      throw lastNotFoundError ?? new Error('No supported jmwalletd log file found.')
    },
  })

  const alert = useMemo<SimpleAlert | undefined>(() => {
    if (!enabled) return undefined

    if (token === undefined) {
      return {
        variant: 'destructive',
        // TODO: i18n
        message: 'No authentication token available. Please login again.',
      }
    }

    if (!logQueryError) return undefined

    const reason = getErrorReason(logQueryError, t('global.errors.reason_unknown'))
    const errorMessage = t('logs.error_loading_logs_failed', {
      /* TODO: add reason to i18n string */
      reason,
    })

    return {
      variant: 'warning',
      message: errorMessage,
    }
  }, [enabled, logQueryError, t, token])

  const isInitialized = useMemo(() => {
    if (!enabled) return false
    if (token === undefined) return true
    // Once we have data, stay initialized even while background refetches are in flight.
    return logQueryIsFetched || logQueryData !== undefined
  }, [enabled, logQueryData, logQueryIsFetched, token])

  const refresh = useCallback(async () => {
    if (enabled === false || token === undefined) return
    await logQueryRefetch()
  }, [logQueryRefetch, token, enabled])

  return {
    alert,
    isInitialized,
    logFileContent: logQueryData?.content,
    refresh,
    fileName: logQueryData?.fileName ?? preferredLogFileNames[0],
  }
}
