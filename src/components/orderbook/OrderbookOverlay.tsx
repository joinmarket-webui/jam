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
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-dvh max-h-dvh! w-screen max-w-none! flex-col gap-0! overflow-hidden rounded-none border-none p-0!">
        <DialogHeader className="px-4 py-3 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <PageTitle title={t('orderbook.title')} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 w-full flex-1 overflow-hidden px-2 pb-2 sm:px-4 sm:pb-4">
          <OrderbookContent enabled={open} className="flex min-h-0 w-full flex-1 flex-col" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
