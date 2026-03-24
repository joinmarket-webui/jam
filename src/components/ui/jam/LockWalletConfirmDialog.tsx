import { type ComponentProps } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WithRequiredProperty } from '@/types/global'
import { Spinner } from '../spinner'

type LockWalletConfirmDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  onConfirm: () => Promise<void>
  makerRunning: boolean
  coinjoinInProgress: boolean
}

export const LockWalletConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  makerRunning,
  coinjoinInProgress,
  ...dialogProps
}: LockWalletConfirmDialogProps) => {
  const { t } = useTranslation()

  const confirmMutation = useMutation({
    mutationFn: onConfirm,
    retry: false,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wallets.wallet_preview.modal_lock_wallet_title')}</DialogTitle>
        </DialogHeader>
        {makerRunning && (
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertDescription>{t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')}</AlertDescription>
          </Alert>
        )}
        {coinjoinInProgress && (
          <Alert variant="warning">
            <AlertTriangleIcon />
            <AlertDescription>
              {t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')}
            </AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground">{t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmMutation.isPending}>
            {t('global.cancel')}
          </Button>
          <Button variant="default" onClick={() => void onConfirm()} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('wallets.wallet_preview.button_locking')}
              </>
            ) : (
              t('wallets.wallet_preview.button_lock')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
