import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { WalletFileName } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

interface SweepPageProps {
  walletFileName: WalletFileName
}

export const SweepPage = ({ walletFileName }: SweepPageProps) => {
  const { t } = useTranslation()

  if (!walletFileName) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pt-6">
        <h1 className="mb-2 text-left text-2xl font-bold">{t('scheduler.title')}</h1>
        <p className="text-muted-foreground mb-4">{t('current_wallet.error_loading_failed')}</p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">{t('scheduler.title')}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{t('scheduler.subtitle')}</p>

      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>Under construction</AlertTitle>
        <AlertDescription>Not yet implemented.</AlertDescription>
      </Alert>
    </div>
  )
}
