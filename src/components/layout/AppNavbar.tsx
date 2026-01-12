import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { Loader2Icon, LogOutIcon, MoonIcon, SettingsIcon, ShuffleIcon, SunIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { isDevMode } from '@/constants/debugFeatures'
import { routes } from '@/constants/routes'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Skeleton } from '../ui/skeleton'
import type { SidebarContextProps } from '../ui/use-sidebar'

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

type WalletPreviewProps = Pick<
  AppNavbarProps,
  'isLoading' | 'walletName' | 'formatAmount' | 'currencySymbol' | 'totalBalance'
>

const WalletPreview = ({
  walletName,
  formatAmount,
  currencySymbol,
  totalBalance,
  isLoading = false,
}: WalletPreviewProps) => {
  return (
    <div className="flex flex-1 items-center">
      <Link to={routes.home} className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center">
          {isLoading ? (
            <Loader2Icon className="animate-spin text-gray-400" strokeWidth={3} />
          ) : (
            <WalletIcon strokeWidth={1} />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="font-semibold tracking-tight">{walletName ?? '...'}</div>
            {isDevMode() && <DevBadge />}
          </div>
          <div className="flex min-h-6 min-w-[150px] items-center">
            {isLoading ? (
              <Skeleton className="h-4 w-full bg-neutral-200 dark:bg-neutral-600" />
            ) : (
              <>
                <span className="tabular-nums">{formatAmount(totalBalance)}</span>
                {currencySymbol('sm')}
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

const ThemeToggleButton = ({ theme, toggleTheme }: Pick<AppNavbarProps, 'theme' | 'toggleTheme'>) => {
  return (
    <Button
      variant="ghost-navbar"
      size="icon"
      onClick={toggleTheme}
      aria-label={/* TODO: i18n */ 'Toggle dark/light mode'}
      title={/* TODO: i18n */ 'Toggle dark/light mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

type SessionInfo = Pick<SessionResponse, 'maker_running' | 'coinjoin_in_process' | 'schedule'>
type SidebarInfo = Pick<SidebarContextProps, 'isMobile' | 'open' | 'openMobile'>

interface AppNavbarProps {
  isLoading?: boolean
  walletName: string | null
  formatAmount: (AmountSats: number) => string
  currencySymbol: (size: 'sm' | 'lg') => React.ReactNode
  totalBalance: AmountSats
  theme: string
  toggleTheme: () => void
  onLogout: () => Promise<void>
  sidebarTrigger?: React.ReactNode
  sessionInfo?: SessionInfo
  sidebarInfo?: SidebarInfo
}

export function AppNavbar({
  isLoading = false,
  walletName,
  totalBalance,
  theme,
  formatAmount,
  currencySymbol,
  toggleTheme,
  onLogout,
  sidebarTrigger,
  sessionInfo,
  sidebarInfo,
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

  return (
    <header className="light:bg-gray-100 light:text-black flex items-center justify-between bg-[#23262b] px-4 py-2 text-white transition-colors duration-300">
      <WalletPreview
        isLoading={isLoading}
        walletName={walletName}
        totalBalance={totalBalance}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
      />
      <div
        className={cn(
          'hidden min-w-0 flex-1 items-center justify-center text-sm font-semibold md:gap-6 lg:gap-12 lg:text-base',
          {
            'md:flex': !isSidebarOpen,
            'lg:flex': isSidebarOpen,
          },
        )}
      >
        <Link to={routes.receive} className="text-muted-foreground hover:text-foreground">
          {t('navbar.tab_receive')}
        </Link>
        <Link to={routes.send} className="text-muted-foreground hover:text-foreground relative">
          <WithActivityIndicator active={singleCoinJoinRunning}>{t('navbar.tab_send')}</WithActivityIndicator>
        </Link>
        <Link to={routes.earn} className="text-muted-foreground hover:text-foreground relative">
          <WithActivityIndicator active={makerRunning}>{t('navbar.tab_earn')}</WithActivityIndicator>
        </Link>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <Link to={routes.sweep} className="text-muted-foreground hover:text-foreground relative">
          <WithActivityIndicator active={schedulerRunning}>{t('navbar.tab_sweep')}</WithActivityIndicator>
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {joiningRoute && (
          <Button
            variant="ghost-navbar"
            size="icon"
            onClick={() => navigate(joiningRoute)}
            aria-label={t('navbar.joining_in_progress')}
            title={t('navbar.joining_in_progress')}
            className="light:text-green-600 text-green-300"
          >
            <ShuffleIcon className="motion-safe:animate-pulse" />
          </Button>
        )}
        <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
        <Button
          aria-label={t('navbar.menu_mobile_settings')}
          title={t('navbar.menu_mobile_settings')}
          variant="ghost-navbar"
          size="icon"
          onClick={() => navigate(routes.settings)}
        >
          <SettingsIcon />
        </Button>
        <Button
          variant="ghost-navbar"
          size="icon"
          onClick={onLogout}
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
