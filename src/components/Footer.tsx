import { useState } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import { AlertTriangleIcon, BlocksIcon, BookOpenIcon, CheckIcon, FileIcon, XIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useStore } from 'zustand'
import { OrderbookOverlay } from '@/components/orderbook/OrderbookOverlay'
import { Button } from '@/components/ui/button'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { routes } from '@/constants/routes'
import { useJmInfo } from '@/hooks/useJmInfo'
import { toSemVer } from '@/lib/utils'
import { jmSessionStore } from '@/store/jmSessionStore'
import packageInfo from '../../package.json'
import PageTitle from './PageTitle'
import { Dialog, DialogContent, DialogFooter, DialogHeader } from './ui/dialog'

const APP_DISPLAY_VERSION = (() => {
  const version = toSemVer(packageInfo.version)
  return version.raw
})()

export function Footer() {
  const { t } = useTranslation()
  const blockHeight = useStore(jmSessionStore, (state) => state.state?.block_height)
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false)
  const [isShowBetaWarning, setShowBetaWarning] = useState(false)
  const [isOrderbookOverlayOpen, setIsOrderbookOverlayOpen] = useState(false)

  return (
    <>
      <footer className="flex items-center justify-between p-4">
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
          <Button variant="outline" size="sm" onClick={() => setIsCheatsheetOpen(true)}>
            <FileIcon />
            {t('footer.cheatsheet')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsOrderbookOverlayOpen(true)}>
            <BookOpenIcon />
            {t('footer.orderbook')}
          </Button>
        </div>

        <div className="flex flex-1 justify-end gap-2 text-xs">
          <div className="flex items-center">
            {isDebugFeatureEnabled('devSetupPage') && (
              <div className="">
                <Link className="light:text-yellow-800 text-sm text-yellow-200 underline" to={routes.__devSetup}>
                  Dev Setup
                </Link>
              </div>
            )}
          </div>
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
                <BlocksIcon className="h-4 w-4" /> {blockHeight}
              </span>
            )}
          </div>
        </div>
      </footer>

      {isCheatsheetOpen && <Cheatsheet setIsCheatsheetOpen={setIsCheatsheetOpen} />}
      <OrderbookOverlay open={isOrderbookOverlayOpen} onOpenChange={setIsOrderbookOverlayOpen} />
    </>
  )
}

const BetaWarningModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { t } = useTranslation()
  const { version } = useJmInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="sr-only">{t('footer.warning_alert_title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <div className="light:border-yellow-800 light:bg-yellow-50 my-1 rounded-lg border border-yellow-200 bg-yellow-900/20 p-4">
            <div className="flex items-start gap-2">
              <div className="light:text-yellow-800 text-md text-yellow-200">
                <div className="flex items-center">
                  <AlertTriangleIcon className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
                  <p className="text-md font-medium">{t('footer.warning_alert_title')}</p>
                </div>
                <p className="p-1 text-sm">{t('footer.warning_alert_text')}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            JoinMarket: v{version?.raw || '_unknown'}
            <br />
            Jam: v{APP_DISPLAY_VERSION}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('footer.warning_alert_button_ok')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Cheatsheet = ({ setIsCheatsheetOpen }: { setIsCheatsheetOpen: (value: boolean) => void }) => {
  const { t } = useTranslation()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsCheatsheetOpen(false)
      setIsAnimating(false)
    }, 300)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
      <div className="fixed inset-0 z-0" onClick={handleClose} />
      <div
        className={`relative z-10 flex max-h-[80vh] w-full max-w-[90vw] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 ease-out sm:max-w-[550px] dark:bg-[#181b20] ${
          isAnimating ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <PageTitle title={t('cheatsheet.title')} />
            <Button onClick={handleClose} variant="ghost" size="lg" title={t('global.close')}>
              <XIcon />
              <span className="sr-only">{t('global.close')}</span>
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            <Trans i18nKey="cheatsheet.description">
              Follow the steps below to increase your financial privacy. It is advisable to switch from{' '}
              <a
                href="https://jamdocs.org/glossary/#maker"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                earning as a maker
              </a>{' '}
              to{' '}
              <a
                className="font-medium underline"
                href="https://jamdocs.org/glossary/#taker"
                target="_blank"
                rel="noopener noreferrer"
              >
                sending as a taker
              </a>{' '}
              back and forth{''}
              <a
                className="font-medium underline"
                href="https://jamdocs.org/interface/00-cheatsheet/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more.
              </a>
            </Trans>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">
                  <Trans i18nKey="cheatsheet.receive.title">
                    <Link to={routes.receive} className="font-semibold underline">
                      <span>Fund</span>
                    </Link>{' '}
                    your wallet.
                  </Trans>
                </h3>
                <p className="text-muted-foreground text-sm">{t('cheatsheet.receive.description')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">
                  <Trans i18nKey="cheatsheet.send.title">
                    <Link to={routes.send} className="font-semibold underline">
                      <span>Send</span>
                    </Link>{' '}
                    a collaborative transaction to another jar.
                  </Trans>
                </h3>
                <p className="text-muted-foreground text-sm">{t('cheatsheet.send.description')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">
                  <Trans i18nKey="cheatsheet.bond.title">
                    Optional:
                    <Link to={routes.earn} className="font-semibold underline">
                      <span>Lock</span>
                    </Link>{' '}
                    funds in a fidelity bond.
                  </Trans>
                </h3>
                <p className="text-muted-foreground text-sm">{t('cheatsheet.bond.description')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">
                  <Trans i18nKey="cheatsheet.earn.title">
                    <Link to={routes.earn} className="font-semibold underline">
                      <span>Earn</span>
                    </Link>{' '}
                    sats by providing liquidity.
                  </Trans>
                </h3>
                <p className="text-muted-foreground text-sm">{t('cheatsheet.earn.description')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">
                  <Trans i18nKey="cheatsheet.schedule.title">
                    Schedule
                    <Link to={routes.sweep} className="font-semibold underline">
                      sweep
                    </Link>{' '}
                    transactions to empty your wallet.
                  </Trans>
                </h3>
                <p className="text-muted-foreground text-sm">{t('cheatsheet.schedule.description')}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black font-bold text-white dark:bg-white dark:text-black">
                <CheckIcon className="size-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground mb-1">{t('cheatsheet.repeat.title')}</h3>
                <p className="text-muted-foreground text-sm">
                  <Trans i18nKey="cheatsheet.repeat.description">
                    Still confused?{' '}
                    <a
                      className="font-medium underline"
                      href="https://jamdocs.org/interface/00-cheatsheet/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Dig into the documentation
                    </a>
                  </Trans>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
