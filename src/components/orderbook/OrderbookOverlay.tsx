import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageTitle from '@/components/ui/jam/PageTitle'
import { OrderbookContent } from './OrderbookContent'

interface OrderbookOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderbookOverlay({ open, onOpenChange }: OrderbookOverlayProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PageTitle title={t('orderbook.title')} />
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden">
          <OrderbookContent enabled={open} className="flex h-full flex-col" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
