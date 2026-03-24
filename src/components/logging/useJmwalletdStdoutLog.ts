import type { ComponentProps } from 'react'
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Alert } from '@/components/ui/alert'
import { fetchLog } from '@/lib/api/logs'
import { getErrorReason } from '@/lib/errorReason'
import { authStore } from '@/store/authStore'

const JMWALLETD_LOG_FILE_NAME = 'jmwalletd_stdout.log'

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

  const {
    refetch: logQueryRefetch,
    isFetched: logQueryIsFetched,
    data: logQueryData,
    error: logQueryError,
  } = useQuery<string>({
    // Keep query identity stable across token refreshes to avoid flashing back to "loading".
    queryKey: ['logs', JMWALLETD_LOG_FILE_NAME],
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
    queryFn: ({ signal }) => {
      if (token === undefined) return Promise.resolve('')
      return fetchLog({
        token,
        fileName: JMWALLETD_LOG_FILE_NAME,
        signal,
      }).then((response) => response.text())
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

  return { alert, isInitialized, logFileContent: logQueryData, refresh, fileName: JMWALLETD_LOG_FILE_NAME }
}
