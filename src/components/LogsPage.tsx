import { useTranslation } from 'react-i18next'
import { LogsContent } from '@/components/LogsContent'
import PageTitle from './ui/jam/PageTitle'

export const LogsPage = () => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={t('logs.title')} />
      <LogsContent enabled={true} />
    </div>
  )
}
