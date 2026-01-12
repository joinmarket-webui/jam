import { useState } from 'react'
import { AlertTriangleIcon, BlocksIcon, BookOpenIcon, MessageCircleQuestionIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { useStore } from 'zustand'
import { OrderbookOverlay } from '@/components/orderbook/OrderbookOverlay'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Cheatsheet } from '@/components/ui/jam/Cheatsheet'
import { useCheatsheet } from '@/hooks/useCheatsheet'
import { useJmInfo } from '@/hooks/useJmInfo'
import type { JmWebsocket } from '@/hooks/useJmWebsocket'
import { toSemVer } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import packageInfo from '../../../package.json'
import { JmWebsocketInfo } from '../ui/jam/JmWebsocketInfo'

const APP_DISPLAY_VERSION = (() => {
  const version = toSemVer(packageInfo.version)
  return version.raw
})()

const BetaWarningModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { t } = useTranslation()
  const { version } = useJmInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pt-12" showCloseButton={true}>
        <Alert variant="default">
          <AlertTriangleIcon />
          <AlertTitle>{t('footer.warning_alert_title')}</AlertTitle>
          <AlertDescription>{t('footer.warning_alert_text')}</AlertDescription>
        </Alert>

        <p className="text-muted-foreground text-sm">
          JoinMarket: v{version?.raw || '_unknown'}
          <br />
          Jam: v{APP_DISPLAY_VERSION}
        </p>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AppFooterProps {
  websocket?: Pick<JmWebsocket, 'isOpen' | 'isAuthenticated'>
}

export function AppFooter({ websocket }: AppFooterProps) {
  const { t } = useTranslation()
  const cheatsheet = useCheatsheet()

  const blockHeight = useStore(jmSessionStore, (state) => state.state?.block_height)
  const [isShowBetaWarning, setShowBetaWarning] = useState(false)
  const [isOrderbookOverlayOpen, setIsOrderbookOverlayOpen] = useState(false)

  return (
    <>
      <footer className="flex items-center justify-between gap-2 p-4">
        <div className="flex-1 text-xs">
          <BetaWarningModal open={isShowBetaWarning} onOpenChange={setShowBetaWarning} />
          <Trans i18nKey="footer.warning">
            This is pre-alpha software.
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowBetaWarning(true)}>
              Read this before using.
            </Button>
          </Trans>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => cheatsheet.onOpenChange(true)}>
            <MessageCircleQuestionIcon />
            {t('footer.cheatsheet')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsOrderbookOverlayOpen(true)}>
            <BookOpenIcon />
            {t('footer.orderbook')}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 text-xs">
          {websocket !== undefined && (
            <div className="flex flex-col gap-1">
              <JmWebsocketInfo isOpen={websocket.isOpen} isAuthenticated={websocket.isAuthenticated} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <a
              href="https://github.com/joinmarket-webui/jam/tags"
              target="_blank"
              rel="noopener noreferrer"
              className="text-right underline opacity-80"
            >
              v{APP_DISPLAY_VERSION}
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
