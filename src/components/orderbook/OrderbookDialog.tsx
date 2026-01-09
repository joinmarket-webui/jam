import { XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import PageTitle from '../PageTitle'
import { OrderbookContent } from './Orderbook'

interface OrderbookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderbookDialog({ open, onOpenChange }: OrderbookDialogProps) {
  const { t } = useTranslation()
  if (!open) {
    return <></>
  }

  return (
    <div className="light:bg-white animate-slide-up fixed inset-0 z-50 flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <PageTitle title={t('orderbook.title')} />
        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} title={t('global.close')}>
          <XIcon />
          <span className="sr-only">{t('global.close')}</span>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <OrderbookContent className="flex h-full flex-col p-4" />
      </div>
    </div>
  )
}
