import type { ComponentProps } from 'react'
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Alert } from '@/components/ui/alert'
import { isDevMode } from '@/constants/debugFeatures'
import { fetchLog } from '@/lib/api/logs'
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

  const logQuery = useQuery({
    queryKey: ['logs', JMWALLETD_LOG_FILE_NAME, token],
    enabled: enabled && token !== undefined,
    retry: false,
    queryFn: ({ signal }) => {
      if (token === undefined) return Promise.resolve('')
      return fetchLog({
        token,
        fileName: JMWALLETD_LOG_FILE_NAME,
        signal,
      }).then((response) => (response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`))))
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

    if (!logQuery.error) return undefined

    const reason =
      (logQuery.error instanceof Error ? logQuery.error.message : undefined) || t('global.errors.reason_unknown')
    const errorMessage = t('logs.error_loading_logs_failed', {
      /* TODO: add reason to i18n string */
      reason,
    })

    return {
      variant: 'warning',
      message: errorMessage,
    }
  }, [enabled, logQuery.error, t, token])

  const isInitialized = useMemo(() => {
    if (!enabled) return false
    if (token === undefined) return true
    return logQuery.isFetched
  }, [enabled, logQuery.isFetched, token])

  const logFileContent = useMemo(() => {
    if (logQuery.data) return logQuery.data
    if (!isDevMode() || alert?.variant !== 'warning') return undefined
    return `${alert.message}\n`.repeat(1_000)
  }, [alert, logQuery.data])

  const refresh = useCallback(async () => {
    if (token === undefined) return
    await logQuery.refetch()
  }, [logQuery, token])

  return { alert, isInitialized, logFileContent, refresh, fileName: JMWALLETD_LOG_FILE_NAME }
}
