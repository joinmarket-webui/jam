import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { RefreshCwIcon, DownloadIcon, ArrowDownIcon, SearchIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn, delayedPromise } from '@/lib/utils'

interface LogViewerProps {
  fileName: string
  value: string
  refresh: () => Promise<void>
}

export function LogViewer({ fileName, value, refresh }: LogViewerProps) {
  const { t } = useTranslation()
  const logContentRef = useRef<HTMLPreElement>(null)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [logScrollProgress, setLogScrollProgress] = useState(0)
  const [hasAutoScrolledInitially, setHasAutoScrolledInitially] = useState(false)
  const isScrolledToLogBottom = useMemo(() => logScrollProgress >= 0.995, [logScrollProgress])

  // Search: normalize query, split lines, filter matches, count results
  const normalizedSearchValue = useMemo(() => searchValue.trim().toLowerCase(), [searchValue])
  const allLines = useMemo(() => value.split('\n'), [value])

  const filteredLines = useMemo(() => {
    if (normalizedSearchValue.length === 0) return allLines
    return allLines.filter((line) => line.toLowerCase().includes(normalizedSearchValue))
  }, [allLines, normalizedSearchValue])

  const matchingLineCount = useMemo(() => {
    if (normalizedSearchValue.length === 0) return 0
    return filteredLines.length
  }, [filteredLines.length, normalizedSearchValue])

  const scrollToLogBottom = () => {
    logContentRef.current?.scrollTo({
      top: logContentRef.current.scrollHeight,
      behavior: 'smooth',
    })
    setLogScrollProgress(1)
  }

  const scrollToLogTop = () => {
    logContentRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
    setLogScrollProgress(0)
  }

  const logScrollHandler = (event: React.UIEvent<HTMLPreElement>) => {
    const containerHeight = event.currentTarget.clientHeight
    const scrollHeight = event.currentTarget.scrollHeight

    const scrollTop = event.currentTarget.scrollTop
    if (scrollHeight <= 0) {
      setLogScrollProgress(1)
      return
    }
    setLogScrollProgress((scrollTop + containerHeight) / scrollHeight)
  }

  // Scroll to top when searching, otherwise scroll to bottom on new content
  useEffect(() => {
    if (filteredLines.length === 0) return
    if (normalizedSearchValue.length > 0) {
      scrollToLogTop()
      return
    }
    // Follow log tail only on first render or when user is already at the bottom.
    // This avoids jumping away while someone is reading older lines.
    if (!hasAutoScrolledInitially || isScrolledToLogBottom) {
      scrollToLogBottom()

      if (!hasAutoScrolledInitially) {
        setHasAutoScrolledInitially(true)
      }
    }
  }, [filteredLines.length, hasAutoScrolledInitially, isScrolledToLogBottom, normalizedSearchValue])

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

  // Highlight search matches within a single line
  const renderHighlightedLine = useCallback(
    (line: string): ReactNode => {
      if (normalizedSearchValue.length === 0) return line
      const lineLower = line.toLowerCase()
      const queryLength = normalizedSearchValue.length

      const fragments: ReactNode[] = []
      let cursor = 0
      let nextMatchIndex = lineLower.indexOf(normalizedSearchValue, cursor)
      while (nextMatchIndex >= 0) {
        if (nextMatchIndex > cursor) {
          fragments.push(line.slice(cursor, nextMatchIndex))
        }
        const nextCursor = nextMatchIndex + queryLength
        fragments.push(
          <mark
            key={`${line}-${nextMatchIndex}`}
            className="light:bg-yellow-400/80 rounded bg-yellow-500/40 px-0.5 text-current"
          >
            {line.slice(nextMatchIndex, nextCursor)}
          </mark>,
        )
        cursor = nextCursor
        nextMatchIndex = lineLower.indexOf(normalizedSearchValue, cursor)
      }
      if (cursor < line.length) {
        fragments.push(line.slice(cursor))
      }
      return fragments
    },
    [normalizedSearchValue],
  )

  return (
    <Card className="flex flex-1 flex-col overflow-hidden pb-0">
      <CardHeader className="flex flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono break-all select-all">{fileName}</CardTitle>
        {/* Search + action buttons */}
        <div className="flex items-center justify-end gap-2">
          <div className="relative max-w-[360px] min-w-[220px] flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-9 pr-8 pl-8 text-xs"
              placeholder="Search logs..."
              aria-label="Search logs"
            />
            {searchValue.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchValue('')}
                title={t('global.clear')}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
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
      {/* Search match count */}
      {normalizedSearchValue.length > 0 && (
        <div className="text-muted-foreground px-6 pb-2 text-xs">
          {/* TODO: i18n */}
          {matchingLineCount === 0
            ? `No matches for "${searchValue}".`
            : `${matchingLineCount} matching line${matchingLineCount > 1 ? 's' : ''}.`}
        </div>
      )}
      <CardContent className="relative flex-1 overflow-hidden rounded-b-xl p-0">
        <pre
          onScroll={logScrollHandler}
          ref={logContentRef}
          className="bg-muted/90 absolute inset-0 overflow-auto rounded-b-xl px-2 py-2 font-mono text-sm break-words whitespace-pre-wrap"
        >
          {/* Render filtered lines with search highlights */}
          {filteredLines.length === 0 && normalizedSearchValue.length > 0
            ? ''
            : filteredLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {renderHighlightedLine(line)}
                  {index < filteredLines.length - 1 ? '\n' : null}
                </span>
              ))}
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
