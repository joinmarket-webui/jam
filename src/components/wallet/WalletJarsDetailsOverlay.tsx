import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import type { WithRequiredProperty } from '@/types/global'
import PageTitle from '../ui/jam/PageTitle'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

type WalletJarsDetailsOverlayProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> &
  Pick<ComponentProps<typeof WalletJarsDetailsContent>, 'selectedJarIndex' | 'walletFileName'>

export function WalletJarsDetailsOverlay({
  open,
  onOpenChange,
  ...jarDetailsConentProps
}: WalletJarsDetailsOverlayProps) {
  const { t } = useTranslation()
  const isDeveloperMode = useStore(jamSettingsStore, (state) => state.state.developerMode)

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader className="px-2">
          <DialogTitle className="sr-only flex items-center gap-2">
            <PageTitle title={/* todo: i18n */ t('Wallet Jars Details')} />
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden">
          <WalletJarsDetailsContent
            enabled={open}
            className="flex h-full flex-col overflow-auto p-2 pt-0"
            debug={isDeveloperMode}
            {...jarDetailsConentProps}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
