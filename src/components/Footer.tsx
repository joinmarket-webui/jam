import { useState } from 'react'
import { Check, File, X } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { toSemVer } from '@/lib/utils'
import packageInfo from '../../package.json'

const APP_DISPLAY_VERSION = (() => {
  const version = toSemVer(packageInfo.version)
  return version.raw
})()

export function Footer() {
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false)

  return (
    <>
      <footer className="flex items-center justify-between bg-white p-4 text-xs text-black opacity-60 transition-colors duration-300 dark:bg-[#181b20] dark:text-white">
        <span className="flex-1">
          This is pre-alpha software. <br />
          <a href="#" className="underline">
            Read this before using.
          </a>
        </span>
        <div className="flex flex-1 items-center justify-center hover:underline">
          <Button variant="ghost" size="sm" onClick={() => setIsCheatsheetOpen(true)}>
            <File />
            Cheatsheet
          </Button>
        </div>

        <a
          href="https://github.com/joinmarket-webui/jam/tags"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-right underline opacity-80"
        >
          v{APP_DISPLAY_VERSION}
        </a>
      </footer>

      {isCheatsheetOpen && <Cheatsheet setIsCheatsheetOpen={setIsCheatsheetOpen} />}
    </>
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
        className={`relative z-10 max-h-[80vh] w-full max-w-[90vw] overflow-y-auto rounded-t-2xl bg-white p-6 pb-10 shadow-2xl transition-transform duration-200 ease-out sm:max-w-[550px] dark:bg-[#181b20] ${
          isAnimating ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-foreground text-2xl font-semibold">{t('cheatsheet.title')}</span>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground ml-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X />
              </button>
            </div>
            <p className="text-muted-foreground mt-2 leading-relaxed">
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
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-foreground mb-1">
                <Trans i18nKey="cheatsheet.receive.title">
                  <Link to={'/receive'} className="font-semibold underline">
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
                  <Link to={'/send'} className="font-semibold underline">
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
                  <Link to={'/earn'} className="font-semibold underline">
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
                  <Link to={'/earn'} className="font-semibold underline">
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
                  <Link to={'/'} className="font-semibold underline">
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
              <Check className="p-0.5" />
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
  )
}
