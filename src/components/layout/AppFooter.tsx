import { useState, type ComponentProps } from 'react'
import { BlocksIcon, BookOpenIcon, FileQuestionMarkIcon, ScrollTextIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { JmWebsocketInfo } from '@/components/ui/jam/JmWebsocketInfo'
import type { JmWebsocket } from '@/hooks/useJmWebsocket'
import { BetaWarningDialog } from './footer/BetaWarningDialog'

type JmWebsocketInfo = Pick<JmWebsocket, 'isOpen' | 'isAuthenticated'>

type AppFooterProps = Pick<ComponentProps<typeof BetaWarningDialog>, 'jamVersion' | 'joinmarketVersion'> & {
  blockHeight?: number
  websocketInfo?: JmWebsocketInfo
  onClickCheatsheet: () => void
  onClickOrderbook: () => void
  onClickLogs?: () => void
}

export function AppFooter({
  blockHeight,
  websocketInfo,
  jamVersion,
  joinmarketVersion,
  onClickCheatsheet,
  onClickOrderbook,
  onClickLogs,
}: AppFooterProps) {
  const { t } = useTranslation()

  const [isShowBetaWarning, setShowBetaWarning] = useState(false)

  return (
    <>
      <BetaWarningDialog
        open={isShowBetaWarning}
        onOpenChange={setShowBetaWarning}
        joinmarketVersion={joinmarketVersion}
        jamVersion={jamVersion}
      />
      <footer className="flex items-center justify-between gap-2 p-4">
        <div className="hidden flex-1 text-xs sm:block">
          <Trans i18nKey="footer.warning">
            This is pre-alpha software.
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-semibold"
              onClick={() => setShowBetaWarning(true)}
            >
              Read this before using.
            </Button>
          </Trans>
        </div>
        <div className="flex items-center justify-start gap-2 sm:justify-center" data-tour-id="footer-tools">
          <Button variant="outline" size="sm" onClick={onClickCheatsheet} title={t('footer.cheatsheet')}>
            <FileQuestionMarkIcon />
            <span className="hidden sm:inline-block">{t('footer.cheatsheet')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onClickOrderbook} title={t('footer.orderbook')}>
            <BookOpenIcon />
            <span className="hidden sm:inline-block">{t('footer.orderbook')}</span>
          </Button>
          {onClickLogs && (
            <Button variant="outline" size="sm" onClick={onClickLogs} title={t('footer.logs')}>
              <ScrollTextIcon />
              <span className="hidden sm:inline-block">{t('footer.logs')}</span>
            </Button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 text-xs break-normal">
          <div className="flex flex-col items-end gap-0.25 text-end">
            {blockHeight && (
              <span className="flex items-center gap-1">
                <BlocksIcon className="size-3" />
                <span className="break-keep slashed-zero tabular-nums select-all">{blockHeight.toLocaleString()}</span>
              </span>
            )}
            <a
              href="https://github.com/joinmarket-webui/jam/tags"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline"
            >
              v{jamVersion?.raw}
            </a>
          </div>
          {websocketInfo !== undefined && (
            <div className="flex flex-col">
              <JmWebsocketInfo isOpen={websocketInfo.isOpen} isAuthenticated={websocketInfo.isAuthenticated} />
            </div>
          )}
        </div>
      </footer>
    </>
  )
}
