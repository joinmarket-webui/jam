import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon, DownloadIcon, ArrowDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isDevMode } from '@/constants/debugFeatures'
import { fetchLog } from '@/lib/api/logs'
import { cn, delayedPromise } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import PageTitle from './ui/jam/PageTitle'

const JMWALLETD_LOG_FILE_NAME = 'jmwalletd_stdout.log'

interface SimpleAlert {
  variant: React.ComponentProps<typeof Alert>['variant']
  message: string
}

interface LogContentProps {
  value: string
  refresh: (signal: AbortSignal) => Promise<void>
}

function LogContent({ value, refresh }: LogContentProps) {
  const { t } = useTranslation()
  const logContentRef = useRef<HTMLPreElement>(null)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [logScrollProgress, setLogScrollProgress] = useState(0)
  const isScrolledToLogBottom = useMemo(() => logScrollProgress >= 0.995, [logScrollProgress])

  const scrollToLogBottom = () => {
    logContentRef.current?.scrollTo({
      top: logContentRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  const logScrollHandler = (event: React.UIEvent<HTMLPreElement>) => {
    const containerHeight = event.currentTarget.clientHeight
    const scrollHeight = event.currentTarget.scrollHeight

    const scrollTop = event.currentTarget.scrollTop
    setLogScrollProgress((scrollTop + containerHeight) / scrollHeight)
  }

  useEffect(() => {
    if (!value) return
    scrollToLogBottom()
  }, [value])

  const handleRefresh = useCallback(async () => {
    if (isLoadingRefresh) return

    setIsLoadingRefresh(true)
    const abortCtrl = new AbortController()

    try {
      await refresh(abortCtrl.signal)
        // Add a short delay to avoid flickering
        .then(() => delayedPromise(210))
    } finally {
      setIsLoadingRefresh(false)
    }
  }, [isLoadingRefresh, refresh])

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = JMWALLETD_LOG_FILE_NAME
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  }, [value])

  return (
    <Card className="pb-0">
      <CardHeader className="flex flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono break-all">{JMWALLETD_LOG_FILE_NAME}</CardTitle>
        <div className="flex items-center justify-end gap-2">
          <Button
            className="hover:[&>svg]:motion-safe:animate-bounce"
            variant="outline"
            onClick={handleDownload}
            disabled={!value || isLoadingRefresh}
            title={t('global.download')}
          >
            <DownloadIcon className="group/download" />
            {t('global.download')}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoadingRefresh} title={t('global.refresh')}>
            <RefreshCwIcon
              className={cn({
                'animate-spin': isLoadingRefresh,
              })}
            />
            {t('global.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative rounded-b-xl p-0">
        <pre
          onScrollEnd={logScrollHandler}
          ref={logContentRef}
          className="bg-muted/90 max-h-[600px] min-h-[300px] overflow-auto rounded-b-xl px-2 py-2 font-mono text-sm break-words whitespace-pre-wrap"
        >
          {value}
        </pre>
        <Button
          className={cn('absolute top-2 right-2 size-12', {
            'opacity-25 hover:opacity-50': !isScrolledToLogBottom,
            hidden: isScrolledToLogBottom,
          })}
          variant={isScrolledToLogBottom ? 'ghost' : 'default'}
          disabled={isScrolledToLogBottom}
          size="icon"
          onClick={scrollToLogBottom}
          title={/* TODO: i18n */ 'Scroll to bottom'}
        >
          <ArrowDownIcon />
        </Button>
      </CardContent>
    </Card>
  )
}

export const LogsPage = () => {
  const authState = useStore(authStore, (state) => state.state)
  const { t } = useTranslation()
  const [alert, setAlert] = useState<SimpleAlert>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [logFileContent, setLogFileContent] = useState<string>()

  const refresh = useCallback(
    async (signal: AbortSignal) => {
      if (!authState?.auth?.token) {
        // TODO: i18n
        setAlert({
          variant: 'destructive',
          message: 'No authentication token available. Please login again.',
        })
        return Promise.reject(new Error('No authentication token'))
      }

      return fetchLog({
        token: authState.auth.token,
        fileName: JMWALLETD_LOG_FILE_NAME,
        signal,
      })
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data) => {
          if (signal.aborted) return
          setAlert(undefined)
          setLogFileContent(data)
        })
        .catch((e) => {
          if (signal.aborted) return

          const errorMessage = t('logs.error_loading_logs_failed', {
            /* TODO: add reason to i18n string */
            reason: e.message || t('global.errors.reason_unknown'),
          })

          if (isDevMode()) {
            // adding content enables manual testing of other component
            // and functionality (e.g. downloading, refreshing, etc.)
            setLogFileContent(`${errorMessage}\n`.repeat(1_000))
          }

          setAlert({
            variant: 'warning',
            message: errorMessage,
          })
        })
    },
    [t, authState],
  )

  if (!isInitialized) {
    const abortCtrl = new AbortController()
    refresh(abortCtrl.signal).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsInitialized(true)
    })
  }

  if (!isInitialized) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="m-2 flex items-center justify-center gap-2">
          <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
          {t('global.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={t('logs.title')} />

      {alert && (
        <Alert variant={alert.variant}>
          <AlertTriangleIcon />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {logFileContent && <LogContent value={logFileContent} refresh={refresh} />}
    </div>
  )
}
