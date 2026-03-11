import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WithRequiredProperty } from '@/types/global'
import { OrderbookContent } from './OrderbookContent'

type OrderbookOverlayProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
>

export function OrderbookOverlay({ open, onOpenChange, ...dialogProps }: OrderbookOverlayProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)} {...dialogProps}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader className="px-2">
          <DialogTitle className="flex items-center gap-2">
            <PageTitle title={t('orderbook.title')} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <OrderbookContent enabled={open} className="flex h-full flex-col p-2 pt-0" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
