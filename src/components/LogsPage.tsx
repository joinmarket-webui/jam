import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LogViewer } from '@/components/logging/LogViewer'
import { useJmwalletdStdoutLog } from '@/components/logging/useJmwalletdStdoutLog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PageTitle from './ui/jam/PageTitle'
import { Spinner } from './ui/spinner'

export const LogsPage = () => {
  const { t } = useTranslation()
  const { alert, isInitialized, logFileContent, refresh, fileName } = useJmwalletdStdoutLog()

  if (!isInitialized) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <div className="m-2 flex items-center justify-center gap-2">
          <Spinner className="motion-reduce:hidden" />
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

      {logFileContent && <LogViewer fileName={fileName} value={logFileContent} refresh={refresh} />}
    </div>
  )
}
