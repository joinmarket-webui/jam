import { AlertTriangleIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { routes } from '@/constants/routes'

interface OrderbookEmptyAlertProps {
  className?: string
}

export const OrderbookEmptyAlert = ({ className }: OrderbookEmptyAlertProps) => {
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
    </Alert>
  )
}
