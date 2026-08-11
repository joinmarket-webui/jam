import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { routes } from '@/constants/routes'
import { Button } from '../button'

interface OrderbookEmptyAlertProps {
  className?: string
  isChecking?: boolean
  onCheckClick?: () => Promise<unknown>
}

export const OrderbookEmptyAlert = ({ className, isChecking, onCheckClick }: OrderbookEmptyAlertProps) => {
  const { t } = useTranslation()

  return (
    <Alert variant="warning" className={className}>
      <AlertTriangleIcon />
      <AlertTitle>{t('orderbook.alert_precheck_empty_title')}</AlertTitle>
      <AlertDescription>
        <Trans
          i18nKey="orderbook.alert_precheck_empty_description"
          components={{
            '1': <Link to={routes.orderbook} className="font-semibold" />,
          }}
        />
      </AlertDescription>
      {onCheckClick && (
        <AlertAction>
          <Button size="xs" type="button" onClick={() => void onCheckClick()} disabled={isChecking}>
            <RefreshCwIcon className={isChecking ? 'motion-safe:animate-spin' : undefined} />
            {isChecking
              ? t('orderbook.alert_precheck_empty_text_button_checking')
              : t('orderbook.alert_precheck_empty_text_button_check')}
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
