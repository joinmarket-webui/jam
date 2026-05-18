import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import type { WithRequiredProperty } from '@/types/global'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Spinner } from '../ui/spinner'

type PaymentAbortDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  isConfirming: boolean
  onConfirm: () => Promise<void>
}

export const PaymentAbortDialog = ({
  open,
  onOpenChange,
  isConfirming,
  onConfirm,
  ...dialogProps
}: PaymentAbortDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('send.confirm_abort_modal.title')}</DialogTitle>
          <DialogDescription>{t('send.confirm_abort_modal.text_body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('global.abort')}
              </>
            ) : (
              t('global.abort')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
