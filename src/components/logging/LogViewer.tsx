import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { RefreshCwIcon, DownloadIcon, ArrowDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, delayedPromise } from '@/lib/utils'

type LogViewerVariant = 'page' | 'fill'

interface LogViewerProps {
  fileName: string
  value: string
  refresh: () => Promise<void>
  variant?: LogViewerVariant
}

export function LogViewer({ fileName, value, refresh, variant = 'page' }: LogViewerProps) {
  const { t } = useTranslation()
  const logContentRef = useRef<HTMLPreElement>(null)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [logScrollProgress, setLogScrollProgress] = useState(0)
  const isScrolledToLogBottom = useMemo(() => logScrollProgress >= 0.995, [logScrollProgress])

  const isFill = variant === 'fill'

  const scrollToLogBottom = () => {
    logContentRef.current?.scrollTo({
      top: logContentRef.current.scrollHeight,
      behavior: 'smooth',
    })
    setLogScrollProgress(1)
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

    try {
      await refresh().then(() => delayedPromise(210))
    } finally {
      setIsLoadingRefresh(false)
    }
  }, [isLoadingRefresh, refresh])

  const handleDownload = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 0)
  }, [fileName, value])

  return (
    <Card
      className={cn('pb-0', {
        'flex flex-1 flex-col overflow-hidden': isFill,
      })}
    >
      <CardHeader className="flex flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono break-all select-all">{fileName}</CardTitle>
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
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isLoadingRefresh}
            title={t('global.refresh')}
          >
            <RefreshCwIcon className={cn({ 'animate-spin': isLoadingRefresh })} />
            {t('global.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={cn('relative rounded-b-xl p-0', {
          'flex-1 overflow-hidden': isFill,
        })}
      >
        <pre
          onScroll={logScrollHandler}
          ref={logContentRef}
          className={cn(
            'bg-muted/90 overflow-auto rounded-b-xl px-2 py-2 font-mono text-sm break-words whitespace-pre-wrap',
            {
              'max-h-[600px] min-h-[300px]': !isFill,
              'absolute inset-0': isFill,
            },
          )}
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
