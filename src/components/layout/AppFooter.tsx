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
      <footer>
        <div className="flex flex-col items-center justify-between gap-8 px-4 py-12 sm:flex-row sm:gap-2 sm:p-4">
          <div
            className="flex flex-col justify-start gap-2 sm:flex-row sm:items-center sm:justify-center"
            data-tour-id="footer-tools"
          >
            <Button variant="outline" size="sm" onClick={onClickCheatsheet} title={t('footer.cheatsheet')}>
              <FileQuestionMarkIcon />
              <span className="">{t('footer.cheatsheet')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onClickOrderbook} title={t('footer.orderbook')}>
              <BookOpenIcon />
              <span className="">{t('footer.orderbook')}</span>
            </Button>
            {onClickLogs && (
              <Button variant="outline" size="sm" onClick={onClickLogs} title={t('footer.logs')}>
                <ScrollTextIcon />
                <span className="">{t('footer.logs')}</span>
              </Button>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-end gap-4 break-normal sm:flex-row">
            {websocketInfo !== undefined && (
              <div className="order-first flex flex-col sm:order-last">
                <JmWebsocketInfo isOpen={websocketInfo.isOpen} isAuthenticated={websocketInfo.isAuthenticated} />
              </div>
            )}
            <div className="flex flex-col items-center gap-0.25 text-end text-xs sm:items-end">
              {blockHeight && (
                <span className="flex items-center gap-1">
                  <BlocksIcon className="size-3" />
                  <span className="break-keep slashed-zero tabular-nums select-all">
                    {blockHeight.toLocaleString()}
                  </span>
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
          </div>
          <div className="order-last flex inline-block flex-1 text-xs sm:order-first">
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
        </div>
      </footer>
    </>
  )
}
