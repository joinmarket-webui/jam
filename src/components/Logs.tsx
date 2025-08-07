import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { fetchLog } from '@/lib/api/logs'
import { getSession } from '@/lib/session'

const JMWALLETD_LOG_FILE_NAME = 'jmwalletd_stdout.log'

interface SimpleAlert {
  variant: 'destructive' | 'default'
  message: string
}

interface LogContentProps {
  content: string
  refresh: (signal: AbortSignal) => Promise<void>
}

function LogContent({ content, refresh }: LogContentProps) {
  const { t } = useTranslation()
  const logContentRef = useRef<HTMLPreElement>(null)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)

  useEffect(() => {
    if (!content || !logContentRef.current) return

    logContentRef.current.scrollTo({
      top: logContentRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [content])

  const handleRefresh = useCallback(() => {
    if (isLoadingRefresh) return

    setIsLoadingRefresh(true)
    const abortCtrl = new AbortController()

    refresh(abortCtrl.signal).finally(() => {
      // Add a short delay to avoid flickering
      setTimeout(() => setIsLoadingRefresh(false), 250)
    })
  }, [isLoadingRefresh, refresh])

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' })
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
  }, [content])

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('logs.title')}</h1>
          </div>
          <Badge variant="secondary" className="mx-2 text-sm">
            {JMWALLETD_LOG_FILE_NAME}
          </Badge>
        </div>
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!content}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingRefresh}
            className="flex items-center gap-2"
          >
            {isLoadingRefresh ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre
            ref={logContentRef}
            className="bg-muted/50 max-h-[600px] overflow-auto rounded-md border p-4 font-mono text-sm break-words whitespace-pre-wrap"
            style={{ minHeight: '300px' }}
          >
            {content || 'No logs available'}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

export const Logs = () => {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<SimpleAlert>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState<string>()

  const refresh = useCallback(
    async (signal: AbortSignal) => {
      const session = getSession()
      if (!session?.auth?.token) {
        setAlert({
          variant: 'destructive',
          message: 'No authentication token available. Please login again.',
        })
        return Promise.reject(new Error('No authentication token'))
      }

      return fetchLog({
        token: session.auth.token,
        signal,
        fileName: JMWALLETD_LOG_FILE_NAME,
      })
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data) => {
          if (signal.aborted) return
          setAlert(undefined)
          setContent(data)
        })
        .catch((e) => {
          if (signal.aborted) return

          // Check if it's a 404 or similar error indicating endpoint doesn't exist
          const isEndpointNotFound = e.message.includes('HTTP 404') || e.message.includes('Empty reply')

          setAlert({
            variant: 'default',
            message: isEndpointNotFound
              ? 'Log endpoint not implemented yet. The logs are available via Docker: `npm run regtest:logs:jmwalletd`'
              : t('logs.error_loading_logs_failed', {
                  reason: e.message || t('global.errors.reason_unknown'),
                }),
          })
        })
        .finally(() => {
          if (signal.aborted) return
          setIsLoading(false)
        })
    },
    [t],
  )

  useEffect(() => {
    const abortCtrl = new AbortController()

    setIsLoading(true)
    refresh(abortCtrl.signal).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
      setIsInitialized(true)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [refresh])

  if (!isInitialized && isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">{t('global.loading')}...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      {alert && (
        <Alert variant={alert.variant}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {content && <LogContent content={content} refresh={refresh} />}
    </div>
  )
}
