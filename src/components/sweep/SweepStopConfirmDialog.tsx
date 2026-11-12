import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { WithRequiredProperty } from '@/types/global'

type SweepStopConfirmDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  isStopping: boolean
  onConfirm: () => Promise<void>
}

export const SweepStopConfirmDialog = ({
  open,
  onOpenChange,
  isStopping,
  onConfirm,
  ...dialogProps
}: SweepStopConfirmDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduler.confirm_stop_modal.title')}</DialogTitle>
          <DialogDescription>{t('scheduler.confirm_stop_modal.text_body')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStopping}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isStopping}>
            {isStopping ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('scheduler.button_stop')}
              </>
            ) : (
              t('scheduler.button_stop')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
