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
import type { SemanticVersion } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'

type BetaWarningDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  jamVersion: SemanticVersion
  joinmarketVersion?: SemanticVersion
}

export const BetaWarningDialog = ({ jamVersion, joinmarketVersion, ...dialogProps }: BetaWarningDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog {...dialogProps}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('footer.warning_alert_title')}</DialogTitle>
          <DialogDescription>{t('footer.warning_alert_text')}</DialogDescription>
        </DialogHeader>
        <div className="items-end-safe text-sm">
          <span className="text-muted-foreground">JoinMarket: </span>
          <span className="font-mono font-semibold">v{joinmarketVersion?.raw || '_unknown'}</span>
          <br />
          <span className="text-muted-foreground">Jam: </span>
          <span className="font-mono font-semibold">v{jamVersion.raw || '_unknown'}</span>
        </div>
        <DialogFooter>
          <Button onClick={() => dialogProps.onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
