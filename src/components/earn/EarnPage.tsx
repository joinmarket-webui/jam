import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface EarnPageProps {
  walletFileName: string
}

export const EarnPage = ({ walletFileName }: EarnPageProps) => {
  const { t } = useTranslation()

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('earn.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('earn.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('earn.subtitle')}</p>

      <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
        <div className="flex items-start gap-2">
          <div className="light:text-yellow-800 text-sm text-yellow-200">
            <div className="flex items-center">
              <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
              <p className="text-md font-medium">Under construction</p>
            </div>
            <p className="p-1 text-xs">Not yet implemented.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
