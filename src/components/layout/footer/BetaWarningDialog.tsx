import type { ComponentProps } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  backendVersion?: SemanticVersion
  backendName?: string
}

export const BetaWarningDialog = ({
  jamVersion,
  backendVersion,
  backendName,
  ...dialogProps
}: BetaWarningDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog {...dialogProps}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('footer.warning_alert_title')}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="footer.warning_alert_text_ng"
              components={{
                '1': (
                  <a
                    href="https://github.com/joinmarket-webui/jam/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  />
                ),
                '2': (
                  <a
                    href="https://jamdocs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  />
                ),
                '3': (
                  <a
                    href="https://github.com/joinmarket-ng/joinmarket-ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  />
                ),
              }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="items-end-safe text-sm">
          <span className="text-muted-foreground">{t('footer.warning_alert_backend')}: </span>
          <span className="font-mono font-semibold select-all" data-testid="BetaWarningDialog#backendName">
            {backendName || 'unknown'}
          </span>
          <br />
          <span className="text-muted-foreground">{t('footer.warning_alert_backend_version')}: </span>
          <span className="font-mono font-semibold select-all" data-testid="BetaWarningDialog#backendVersion">
            {backendVersion?.raw || 'unknown'}
          </span>
          <br />
          <span className="text-muted-foreground">{t('footer.warning_alert_jam_version')}: </span>
          <span className="font-mono font-semibold select-all" data-testid="BetaWarningDialog#jamVersion">
            {jamVersion.raw || 'unknown'}
          </span>
        </div>
        <DialogFooter>
          <Button onClick={() => dialogProps.onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
