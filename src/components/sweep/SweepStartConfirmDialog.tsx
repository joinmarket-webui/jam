import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Address } from '../ui/jam/Address'
import { Balance } from '../ui/jam/Balance'
import { Spinner } from '../ui/spinner'

interface SweepStartConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  disabled: boolean
  isStarting: boolean
  totalBalanceInSats?: number
  destinationAddresses?: string[]
  totalActions?: number
}

export const SweepStartConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  disabled,
  isStarting,
  totalBalanceInSats,
  destinationAddresses,
  totalActions,
}: SweepStartConfirmDialogProps) => {
  const { t } = useTranslation()

  const hasBalance = totalBalanceInSats !== undefined
  const hasActions = totalActions !== undefined && totalActions > 0
  const hasDestinations = destinationAddresses && destinationAddresses.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduler.confirm_start_modal.title')}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t('scheduler.confirm_start_modal.text_body')}</p>

        {(hasBalance || hasActions || hasDestinations) && (
          <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
            {hasBalance && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-medium">{t('scheduler.complete_wallet_title')}</span>
                <span className="font-semibold">
                  <Balance valueString={String(totalBalanceInSats)} />
                </span>
              </div>
            )}

            {hasActions && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-medium">{t('scheduler.section_details_title')}</span>
                <span className="text-foreground font-medium">
                  {t('scheduler.confirm_start_modal.actions_count', { count: totalActions })}
                </span>
              </div>
            )}

            {hasDestinations && (
              <div className="space-y-1.5 pt-1">
                <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
                  {t('scheduler.section_destinations_title')}
                </span>
                <div className="flex flex-col gap-2">
                  {destinationAddresses.map((address, index) => (
                    <div key={index} className="bg-background/80 flex items-center justify-between rounded border p-2">
                      <Address className="text-xs" value={address} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
