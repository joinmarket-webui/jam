import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LogViewer } from '@/components/logging/LogViewer'
import type { LogViewerVariant } from '@/components/logging/LogViewer'
import { useJmwalletdStdoutLog } from '@/components/logging/useJmwalletdStdoutLog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface LogsContentProps {
  className?: string
  enabled: boolean
  viewerVariant?: LogViewerVariant
}

export const LogsContent = ({ enabled, className, viewerVariant = 'fill' }: LogsContentProps) => {
  const { t } = useTranslation()
  const { alert, isInitialized, logFileContent, refresh, fileName } = useJmwalletdStdoutLog({ enabled })

  if (!isInitialized) {
    return (
      <div className={cn('flex items-center justify-center gap-2', className)}>
        <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
        {t('global.loading')}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        {
          'min-h-0 flex-1': viewerVariant === 'fill',
        },
        className,
      )}
    >
      {alert && (
        <Alert variant={alert.variant}>
          <AlertTriangleIcon />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {logFileContent && (
        <LogViewer variant={viewerVariant} fileName={fileName} value={logFileContent} refresh={refresh} />
      )}
    </div>
  )
}
