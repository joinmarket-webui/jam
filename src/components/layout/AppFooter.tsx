import { useState, type ComponentProps } from 'react'
import { AlertTriangleIcon, BlocksIcon, BookOpenIcon, FileQuestionMarkIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { useStore } from 'zustand'
import { OrderbookOverlay } from '@/components/orderbook/OrderbookOverlay'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Cheatsheet } from '@/components/ui/jam/Cheatsheet'
import { JmWebsocketInfo } from '@/components/ui/jam/JmWebsocketInfo'
import { useCheatsheet } from '@/hooks/useCheatsheet'
import type { JmWebsocket } from '@/hooks/useJmWebsocket'
import type { SemVer } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'

type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property]
}

type BetaWarningModalProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  jamVersion: SemVer
  joinmarketVersion?: SemVer
}

const BetaWarningModal = ({ jamVersion, joinmarketVersion, ...dialogProps }: BetaWarningModalProps) => {
  const { t } = useTranslation()

  return (
    <Dialog {...dialogProps}>
      <DialogContent className="pt-12" showCloseButton={true}>
        <Alert variant="default">
          <AlertTriangleIcon />
          <AlertTitle>{t('footer.warning_alert_title')}</AlertTitle>
          <AlertDescription>{t('footer.warning_alert_text')}</AlertDescription>
        </Alert>

        <p className="text-muted-foreground text-sm">
          JoinMarket: v{joinmarketVersion?.raw || '_unknown'}
          <br />
          Jam: v{jamVersion.raw || '_unknown'}
        </p>
        <DialogFooter>
          <Button onClick={() => dialogProps.onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type JmWebsocketInfo = Pick<JmWebsocket, 'isOpen' | 'isAuthenticated'>

type AppFooterProps = Pick<BetaWarningModalProps, 'jamVersion' | 'joinmarketVersion'> & {
  websocketInfo?: JmWebsocketInfo
}

export function AppFooter({ websocketInfo, jamVersion, joinmarketVersion }: AppFooterProps) {
  const { t } = useTranslation()
  const cheatsheet = useCheatsheet()

  const blockHeight = useStore(jmSessionStore, (state) => state.state?.block_height)
  const [isShowBetaWarning, setShowBetaWarning] = useState(false)
  const [isOrderbookOverlayOpen, setIsOrderbookOverlayOpen] = useState(false)

  return (
    <>
      <footer className="flex items-center justify-between gap-2 p-4">
        <div className="hidden flex-1 text-xs sm:block">
          <BetaWarningModal
            open={isShowBetaWarning}
            onOpenChange={setShowBetaWarning}
            joinmarketVersion={joinmarketVersion}
            jamVersion={jamVersion}
          />
          <Trans i18nKey="footer.warning">
            This is pre-alpha software.
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowBetaWarning(true)}>
              Read this before using.
            </Button>
          </Trans>
        </div>
        <div className="flex flex-1 items-center justify-start gap-2 sm:justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => cheatsheet.onOpenChange(true)}
            title={t('footer.cheatsheet')}
          >
            <FileQuestionMarkIcon />
            <span className="hidden sm:inline-block">{t('footer.cheatsheet')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOrderbookOverlayOpen(true)}
            title={t('footer.orderbook')}
          >
            <BookOpenIcon />
            <span className="hidden sm:inline-block">{t('footer.orderbook')}</span>
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 text-xs">
          {websocketInfo !== undefined && (
            <div className="flex flex-col gap-1">
              <JmWebsocketInfo isOpen={websocketInfo.isOpen} isAuthenticated={websocketInfo.isAuthenticated} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <a
              href="https://github.com/joinmarket-webui/jam/tags"
              target="_blank"
              rel="noopener noreferrer"
              className="text-right underline opacity-80"
            >
              v{jamVersion?.raw}
            </a>
            {blockHeight && (
              <span className="flex items-center gap-1">
                <BlocksIcon className="size-4" /> {blockHeight}
              </span>
            )}
          </div>
        </div>
      </footer>

      <Cheatsheet open={cheatsheet.isOpen} onOpenChange={cheatsheet.onOpenChange} />
      <OrderbookOverlay open={isOrderbookOverlayOpen} onOpenChange={setIsOrderbookOverlayOpen} />
    </>
  )
}
