import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LogViewer } from '@/components/logging/LogViewer'
import { useJmwalletdStdoutLog } from '@/components/logging/useJmwalletdStdoutLog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface LogsContentProps {
  className?: string
  enabled: boolean
}

export const LogsContent = ({ enabled, className }: LogsContentProps) => {
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
    <div className={cn('flex flex-col gap-3', className)}>
      {alert && (
        <Alert variant={alert.variant}>
          <AlertTriangleIcon />
          <AlertDescription className="whitespace-pre-line">{alert.message}</AlertDescription>
        </Alert>
      )}

      {logFileContent && <LogViewer fileName={fileName} value={logFileContent} refresh={refresh} />}
    </div>
  )
}
