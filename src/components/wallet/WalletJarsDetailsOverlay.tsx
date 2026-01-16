import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageTitle from '../ui/jam/PageTitle'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

type WalletJarsDetailsOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
} & Pick<ComponentProps<typeof WalletJarsDetailsContent>, 'selectJarIndex'>

export function WalletJarsDetailsOverlay({ open, onOpenChange, selectJarIndex }: WalletJarsDetailsOverlayProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader className="sr-only">
          <DialogTitle className="flex items-center gap-2">
            <PageTitle title={/* todo: i18n */ t('Wallet Jars Details')} />
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden">
          <WalletJarsDetailsContent
            enabled={open}
            className="flex h-full flex-col overflow-auto"
            selectJarIndex={selectJarIndex}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
