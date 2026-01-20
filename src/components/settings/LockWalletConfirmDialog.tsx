import type { ComponentProps } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { WithRequiredProperty } from '@/types/global'

type LockWalletConfirmDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  onConfirm: () => void
  isLocking?: boolean
}

export const LockWalletConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isLocking = false,
}: LockWalletConfirmDialogProps) => {
  const { t } = useTranslation()
  const session = useStore(jmSessionStore, (state) => state.state)

  const makerRunning = session?.maker_running === true
  const coinjoinInProgress = session?.coinjoin_in_process === true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wallets.wallet_preview.modal_lock_wallet_title')}</DialogTitle>
          <DialogDescription>
            {t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {makerRunning && (
            <Alert variant="warning">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>{t('wallets.wallet_preview.modal_lock_wallet_title')}</AlertTitle>
              <AlertDescription>{t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')}</AlertDescription>
            </Alert>
          )}
          {coinjoinInProgress && (
            <Alert variant="warning">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>{t('wallets.wallet_preview.modal_lock_wallet_title')}</AlertTitle>
              <AlertDescription>
                {t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLocking}>
            {t('global.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLocking}>
            {isLocking ? t('wallets.wallet_preview.button_locking') : t('wallets.wallet_preview.button_lock')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
