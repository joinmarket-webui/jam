import { useTranslation } from 'react-i18next'
import { Spinner } from '@/components/ui/spinner'

export const PageLoading = () => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="m-2 flex items-center justify-center gap-2">
        <Spinner className="motion-reduce:hidden" />
        {t('global.loading')}
      </div>
    </div>
  )
}
