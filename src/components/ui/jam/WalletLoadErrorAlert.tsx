import { AlertCircleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface WalletLoadErrorAlertProps {
  reason?: string
  iconClassName?: string
}

export const WalletLoadErrorAlert = ({ reason, iconClassName }: WalletLoadErrorAlertProps) => {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive">
      <AlertCircleIcon className={iconClassName} />
      <AlertTitle>{t('wallets.error_loading_failed')}</AlertTitle>
      <AlertDescription>{reason || t('global.errors.reason_unknown')}</AlertDescription>
    </Alert>
  )
}
