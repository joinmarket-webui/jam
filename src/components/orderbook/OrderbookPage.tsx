import { useTranslation } from 'react-i18next'
import PageTitle from '../ui/jam/PageTitle'
import { OrderbookContent } from './OrderbookContent'

export const OrderbookPage = () => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto space-y-3 p-4">
      <PageTitle title={t('orderbook.title')} />
      <OrderbookContent />
    </div>
  )
}
