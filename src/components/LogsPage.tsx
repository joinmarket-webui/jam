import { useTranslation } from 'react-i18next'
import { LogsContent } from '@/components/LogsContent'
import PageTitle from './ui/jam/PageTitle'

export const LogsPage = () => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex h-full min-h-0 flex-col gap-3 p-4">
      <PageTitle title={t('logs.title')} />
      <LogsContent enabled={true} className="min-h-0 flex-1" />
    </div>
  )
}
