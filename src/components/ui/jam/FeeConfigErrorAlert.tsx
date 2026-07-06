import { AlertTriangleIcon, HandCoinsIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface FeeConfigErrorAlertProps {
  onOpenFeeConfig: () => void
  className?: string
}

export const FeeConfigErrorAlert = ({ onOpenFeeConfig, className }: FeeConfigErrorAlertProps) => {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangleIcon />
      <AlertDescription className="flex flex-col gap-2">
        <div>{t('send.taker_error_message_max_fees_config_missing')}</div>
        <div>
          <Button variant="outline" onClick={onOpenFeeConfig}>
            <HandCoinsIcon />
            {t('settings.show_fee_config')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
