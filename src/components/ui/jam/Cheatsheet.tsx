import { useState, type ComponentProps, type ReactNode } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import PageTitle from '@/components/ui/jam/PageTitle'
import { routes } from '@/constants/routes'
import type { WithRequiredProperty } from '@/types/global'
import type { Dialog } from '../dialog'

type NumberedProps = {
  number: number | 'last'
}

function Numbered({ number }: NumberedProps) {
  return (
    <div className="bg-foreground text-background flex size-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold">
      {number === 'last' ? <CheckIcon className="size-4" strokeWidth={3} /> : <>{number}</>}
    </div>
  )
}

type ListItemProps = NumberedProps & {
  title: ReactNode | string
  description: ReactNode | string
}

function ListItem({ number, title, description }: ListItemProps) {
  return (
    <div className="flex gap-4">
      <Numbered number={number} />
      <div className="flex-1">
        <h3 className="text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  )
}

type CheatsheetProps = WithRequiredProperty<Omit<ComponentProps<typeof Dialog>, 'children'>, 'open' | 'onOpenChange'>

export const Cheatsheet = ({ open, onOpenChange }: CheatsheetProps) => {
  const { t } = useTranslation()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
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
        className={`bg-background relative z-10 flex max-h-[95vh] w-full max-w-[640px] flex-col rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out dark:bg-[#181b20] ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className="flex-shrink-0 p-6">
          <div className="flex items-center justify-between gap-2">
            <PageTitle title={t('cheatsheet.title')} />
            <Button onClick={handleClose} variant="ghost" size="icon" title={t('global.close')}>
              <XIcon />
              <span className="sr-only">{t('global.close')}</span>
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed sm:text-sm md:text-base">
            <Trans i18nKey="cheatsheet.description">
              Follow the steps below to increase your financial privacy. It is advisable to switch from{' '}
              <a
                className="font-semibold underline"
                href="https://jamdocs.org/glossary/#maker"
                target="_blank"
                rel="noopener noreferrer"
              >
                earning as a maker
              </a>{' '}
              to{' '}
              <a
                className="font-semibold underline"
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
          <div className="flex flex-col gap-4 sm:gap-6">
            <ListItem
              number={1}
              title={
                <Trans i18nKey="cheatsheet.receive.title">
                  <Link to={routes.receive} className="font-semibold underline">
                    <span>Fund</span>
                  </Link>{' '}
                  your wallet.
                </Trans>
              }
              description={t('cheatsheet.receive.description')}
            />
            <ListItem
              number={2}
              title={
                <Trans i18nKey="cheatsheet.send.title">
                  <Link to={routes.send} className="font-semibold underline">
                    <span>Send</span>
                  </Link>{' '}
                  a collaborative transaction to another jar.
                </Trans>
              }
              description={t('cheatsheet.send.description')}
            />

            <ListItem
              number={3}
              title={
                <Trans i18nKey="cheatsheet.bond.title">
                  Optional:
                  <Link to={routes.earn} className="font-semibold underline">
                    <span>Lock</span>
                  </Link>{' '}
                  funds in a fidelity bond.
                </Trans>
              }
              description={t('cheatsheet.bond.description')}
            />

            <ListItem
              number={4}
              title={
                <Trans i18nKey="cheatsheet.earn.title">
                  <Link to={routes.earn} className="font-semibold underline">
                    <span>Earn</span>
                  </Link>{' '}
                  sats by providing liquidity.
                </Trans>
              }
              description={t('cheatsheet.earn.description')}
            />

            <ListItem
              number={5}
              title={
                <Trans i18nKey="cheatsheet.schedule.title">
                  Schedule
                  <Link to={routes.sweep} className="font-semibold underline">
                    sweep
                  </Link>{' '}
                  transactions to empty your wallet.
                </Trans>
              }
              description={t('cheatsheet.schedule.description')}
            />

            <ListItem
              number="last"
              title={t('cheatsheet.repeat.title')}
              description={
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
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
