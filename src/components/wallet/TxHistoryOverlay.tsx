import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WithRequiredProperty } from '@/types/global'
import PageTitle from '../ui/jam/PageTitle'
import { TxHistoryContent } from './TxHistoryContent'

type TxHistoryOverlayProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> &
  Pick<ComponentProps<typeof TxHistoryContent>, 'walletFileName'>

export function TxHistoryOverlay({ open, onOpenChange, walletFileName, ...dialogProps }: TxHistoryOverlayProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)} {...dialogProps}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-dvh max-h-dvh! max-w-screen! flex-col overflow-hidden rounded-none border-none">
        <DialogHeader className="px-2">
          <DialogTitle className="sr-only flex items-center gap-2">
            <PageTitle title={t('tx_history.overlay_title')} />
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <TxHistoryContent
            enabled={open}
            walletFileName={walletFileName}
            className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-2 pt-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
