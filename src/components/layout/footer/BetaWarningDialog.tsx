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
  backendName?: string
}

export const BetaWarningDialog = ({
  jamVersion,
  joinmarketVersion,
  backendName,
  ...dialogProps
}: BetaWarningDialogProps) => {
  const { t } = useTranslation()
  const isJoinmarketNg = backendName?.includes('joinmarket-ng') === true
  const backendDisplayName = backendName ?? 'JoinMarket'
  const warningText = isJoinmarketNg ? t('footer.warning_alert_text_ng') : t('footer.warning_alert_text')

  return (
    <Dialog {...dialogProps}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('footer.warning_alert_title')}</DialogTitle>
          <DialogDescription>{warningText}</DialogDescription>
        </DialogHeader>
        <div className="items-end-safe text-sm">
          <span className="text-muted-foreground">{t('footer.warning_alert_backend')}: </span>
          <span className="font-mono font-semibold select-all">{backendDisplayName}</span>
          <br />
          <span className="text-muted-foreground">{t('footer.warning_alert_backend_version')}: </span>
          <span className="font-mono font-semibold select-all">v{joinmarketVersion?.raw || '_unknown'}</span>
          <br />
          <span className="text-muted-foreground">{t('footer.warning_alert_jam_version')}: </span>
          <span className="font-mono font-semibold select-all">v{jamVersion.raw || '_unknown'}</span>
        </div>
        <DialogFooter>
          <Button onClick={() => dialogProps.onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
