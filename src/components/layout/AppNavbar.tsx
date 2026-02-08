import { useState, type PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { TFunction } from 'i18next'
import { LockKeyholeIcon, LogOutIcon, PackageSearchIcon, SettingsIcon, ShuffleIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, type NavigateFunction } from 'react-router-dom'
import { DevBadge } from '@/components/dev/DevBadge'
import { Button } from '@/components/ui/button'
import { ThemeToggleButton } from '@/components/ui/jam/ThemeToggleButton'
import { Skeleton } from '@/components/ui/skeleton'
import type { SidebarContextProps } from '@/components/ui/use-sidebar'
import { isDevMode } from '@/constants/debugFeatures'
import { routes } from '@/constants/routes'
import type { RescanInfo } from '@/context/JamSessionInfoContext'
import { cn, shortenStringMiddle } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { Spinner } from '../ui/spinner'

const WithActivityIndicator = ({ active, children }: PropsWithChildren<{ active: boolean }>) => {
  return (
    <span className="relative">
      {children}
      <span
        className={cn('absolute -top-1 -right-2 text-[8px]', {
          'light:text-green-600 text-green-300 motion-safe:animate-pulse': active,
        })}
      >
        ●
      </span>
    </span>
  )
}

type WalletPreviewProps = {
  isLoading?: boolean
  isReloading?: boolean
  walletName: string | null
  formatAmount: (AmountSats: number) => string
  currencySymbol: (size: 'sm' | 'lg') => React.ReactNode
  totalBalance: AmountSats
  rescanInfo?: RescanInfo
}

const WalletPreview = ({
  walletName,
  formatAmount,
  currencySymbol,
  totalBalance,
  isLoading = false,
  isReloading = false,
  rescanInfo,
}: WalletPreviewProps) => {
  const { t } = useTranslation()
  const walletNameTitle = shortenStringMiddle(walletName ?? '...', 12)

  return (
    <div className="flex flex-1 items-center">
      <Link to={routes.home} className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center">
          {isLoading || isReloading ? (
            <Spinner className="text-muted-foreground size-6 motion-reduce:hidden" strokeWidth={3} />
          ) : (
            <WalletIcon strokeWidth={1} />
          )}
        </div>
        <div className="flex flex-col gap-0.25 leading-none">
          <div className="flex items-center gap-2">
            <div
              className="font-semibold tracking-tight"
              title={walletName && walletName.length !== walletNameTitle.length ? walletName : undefined}
            >
              {walletNameTitle}
            </div>
            {isDevMode() && <DevBadge />}
          </div>
          <div className="flex min-h-5 min-w-[150px] items-center">
            {rescanInfo?.rescanning === true ? (
              <div className="cursor-wait motion-safe:animate-pulse">
                {rescanInfo.progress !== undefined
                  ? t('navbar.text_rescan_in_progress_with_progress', {
                      progress: Math.floor(rescanInfo.progress * 100),
                    })
                  : t('navbar.text_rescan_in_progress')}
              </div>
            ) : (
              <>
                {isLoading ? (
                  <Skeleton className="h-4 w-full bg-neutral-200 dark:bg-neutral-600" />
                ) : (
                  <>
                    <span className="tabular-nums">{formatAmount(totalBalance)}</span>
                    {currencySymbol('sm')}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

type SessionInfo = Pick<SessionResponse, 'maker_running' | 'coinjoin_in_process' | 'schedule'>
type SidebarInfo = Pick<SidebarContextProps, 'isMobile' | 'open' | 'openMobile'>

type AppNavbarProps = WalletPreviewProps & {
  theme: string
  toggleTheme: () => void
  onLogout: (navigate: NavigateFunction) => Promise<void>
  onLockWallet: (navigate: NavigateFunction, t: TFunction<'translation', undefined>) => Promise<void>
  sidebarTrigger?: React.ReactNode
  sessionInfo?: SessionInfo
  sidebarInfo?: SidebarInfo
  rescanInfo?: RescanInfo
}

export function AppNavbar({
  isLoading = false,
  isReloading = false,
  walletName,
  totalBalance,
  theme,
  formatAmount,
  currencySymbol,
  toggleTheme,
  onLogout,
  onLockWallet,
  sidebarTrigger,
  sessionInfo,
  sidebarInfo,
  rescanInfo,
}: AppNavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isSidebarOpen =
    sidebarInfo === undefined ? false : sidebarInfo.isMobile ? sidebarInfo.openMobile : sidebarInfo.open

  const makerRunning = sessionInfo?.maker_running === true
  const singleCoinJoinRunning = sessionInfo?.coinjoin_in_process === true && !sessionInfo?.schedule
  const schedulerRunning = sessionInfo?.coinjoin_in_process === true && !!sessionInfo?.schedule

  const joiningRoute = (() => {
    if (schedulerRunning) return routes.sweep
    if (singleCoinJoinRunning) return routes.send
    if (makerRunning) return routes.earn

    return undefined
  })()

  const rescanningRoute = rescanInfo?.rescanning !== true ? undefined : routes.rescan

  const [isLockingWallet, setIsLockingWallet] = useState(false)
  const doOnLockWallet = async () => {
    try {
      setIsLockingWallet(true)
      await onLockWallet(navigate, t)
    } finally {
      setIsLockingWallet(false)
    }
  }

  return (
    <header className="light:bg-gray-100 light:text-black flex items-center justify-between bg-[#23262b] px-4 py-2 text-white transition-colors duration-300">
      <WalletPreview
        isLoading={isLoading}
        isReloading={isReloading}
        walletName={walletName}
        totalBalance={totalBalance}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
        rescanInfo={rescanInfo}
      />
      <div
        className={cn(
          'hidden min-w-0 flex-1 items-center justify-center text-sm font-semibold md:gap-6 lg:gap-12 lg:text-base',
          {
            'md:flex': !isSidebarOpen,
            'lg:flex': isSidebarOpen,
            'blur-[1px]': rescanInfo?.rescanning === true,
          },
        )}
      >
        <Link to={rescanningRoute ? '#' : routes.receive} className="text-muted-foreground hover:text-foreground">
          {t('navbar.tab_receive')}
        </Link>
        <Link to={rescanningRoute ? '#' : routes.send} className="text-muted-foreground hover:text-foreground relative">
          <WithActivityIndicator active={singleCoinJoinRunning}>{t('navbar.tab_send')}</WithActivityIndicator>
        </Link>
        <Link to={rescanningRoute ? '#' : routes.earn} className="text-muted-foreground hover:text-foreground relative">
          <WithActivityIndicator active={makerRunning}>{t('navbar.tab_earn')}</WithActivityIndicator>
        </Link>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <Link
          to={rescanningRoute ? '#' : routes.sweep}
          className="text-muted-foreground hover:text-foreground relative"
        >
          <WithActivityIndicator active={schedulerRunning}>{t('navbar.tab_sweep')}</WithActivityIndicator>
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
        {rescanningRoute && (
          <Button
            className="light:text-green-600 text-green-300"
            variant="ghost-navbar"
            size="icon"
            onClick={() => void navigate(rescanningRoute)}
            aria-label={t('navbar.text_rescan_in_progress')}
            title={t('navbar.text_rescan_in_progress')}
          >
            <PackageSearchIcon className="motion-safe:animate-pulse" />
          </Button>
        )}
        {joiningRoute && (
          <Button
            className="light:text-green-600 text-green-300"
            variant="ghost-navbar"
            size="icon"
            onClick={() => void navigate(joiningRoute)}
            aria-label={t('navbar.joining_in_progress')}
            title={t('navbar.joining_in_progress')}
          >
            <ShuffleIcon className="motion-safe:animate-pulse" />
          </Button>
        )}
        <ThemeToggleButton className="hidden sm:flex" variant="ghost-navbar" theme={theme} onClick={toggleTheme} />
        <Button
          variant="ghost-navbar"
          size="icon"
          onClick={() => void navigate(routes.settings)}
          aria-label={t('navbar.menu_mobile_settings')}
          title={t('navbar.menu_mobile_settings')}
        >
          <SettingsIcon />
        </Button>
        <Button
          className="hidden sm:flex"
          variant="ghost-navbar"
          size="icon"
          onClick={() => void doOnLockWallet()}
          aria-label={t('settings.button_lock_wallet')}
          title={t('settings.button_lock_wallet')}
          disabled={isLockingWallet}
        >
          <LockKeyholeIcon />
        </Button>
        <Button
          className="hidden sm:flex"
          variant="ghost-navbar"
          size="icon"
          onClick={() => void onLogout(navigate)}
          aria-label={/* TODO: i18n */ 'Logout'}
          title={/* TODO: i18n */ 'Logout'}
        >
          <LogOutIcon />
        </Button>
        {sidebarTrigger}
      </div>
    </header>
  )
}
