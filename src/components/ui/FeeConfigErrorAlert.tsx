import { Settings } from 'lucide-react'
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
      <AlertDescription className="flex items-center justify-between">
        <span>{t('send.taker_error_message_max_fees_config_missing')}</span>
        <Button variant="outline" size="sm" onClick={onOpenFeeConfig} className="ml-4 shrink-0">
          <Settings className="mr-2 h-4 w-4" />
          {t('settings.show_fee_config')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
