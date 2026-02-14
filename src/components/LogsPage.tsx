import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LogViewer } from '@/components/logging/LogViewer'
import { useJmwalletdStdoutLog } from '@/components/logging/useJmwalletdStdoutLog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageLoading } from '@/components/ui/jam/PageLoading'
import PageTitle from './ui/jam/PageTitle'

export const LogsPage = () => {
  const { t } = useTranslation()
  const { alert, isInitialized, logFileContent, refresh, fileName } = useJmwalletdStdoutLog()

  if (!isInitialized) {
    return <PageLoading />
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
