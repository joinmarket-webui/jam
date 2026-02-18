import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '../ui/spinner'

interface SweepStartConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  disabled: boolean
  isStarting: boolean
}

export const SweepStartConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  disabled,
  isStarting,
}: SweepStartConfirmDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduler.confirm_modal.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t('scheduler.confirm_modal.body')}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStarting}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button variant="default" onClick={() => void onConfirm()} disabled={disabled}>
            {isStarting ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('scheduler.button_start')}
              </>
            ) : (
              t('modal.confirm_button_accept')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
