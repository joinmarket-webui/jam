import { useState } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PageTitle from '@/components/ui/jam/PageTitle'
import { routes } from '@/constants/routes'

interface CheatsheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const Cheatsheet = ({ open, onOpenChange }: CheatsheetProps) => {
  const { t } = useTranslation()
  const [onCloseAnimationEnabled, setOnCloseAnimationEnabled] = useState(false)

  const handleClose = () => {
    setOnCloseAnimationEnabled(true)
    setTimeout(() => {
      setOnCloseAnimationEnabled(false)
      onOpenChange(false)
    }, 333)
  }

  if (!open) {
    return <></>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
      <div className="fixed inset-0 z-0" onClick={handleClose} />
      <div
        className={`relative z-10 flex max-h-[80vh] w-full max-w-[90vw] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-200 ease-out sm:max-w-[550px] dark:bg-[#181b20] ${
          onCloseAnimationEnabled ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-center justify-between gap-2">
            <PageTitle title={t('cheatsheet.title')} />
            <Button onClick={handleClose} variant="ghost" size="icon" title={t('global.close')}>
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
