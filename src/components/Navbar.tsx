import type { PropsWithChildren } from 'react'
import { Loader2Icon, LogOutIcon, MoonIcon, Settings, SunIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/button'
import { isDevMode } from '@/constants/debugFeatures'
import { routes } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { DevBadge } from './ui/DevBadge'
import { Skeleton } from './ui/skeleton'

interface NavbarProps {
  isLoading?: boolean
  walletName: string | null
  currencySymbol: (size: 'sm' | 'lg') => React.ReactNode
  totalBalance: number
  theme: string
  toggleTheme: () => void
  formatAmount: (amount: number) => string
}

const WithActivityIndicator = ({ active, children }: PropsWithChildren<{ active: boolean }>) => {
  return (
    <span className="relative">
      {children}
      <span
        className={cn('absolute -top-1 -right-2 text-[8px]', {
          'animate-pulse text-[#6ee7b7]': active,
        })}
      >
        ●
      </span>
    </span>
  )
}

const WalletPreview = ({
  walletName,
  formatAmount,
  currencySymbol,
  totalBalance,
  isLoading = false,
}: Pick<NavbarProps, 'isLoading' | 'walletName' | 'formatAmount' | 'currencySymbol' | 'totalBalance'>) => {
  return (
    <div className="flex flex-1 items-center">
      <Link to={'/'} className="flex items-center gap-2">
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

const ThemeToggleButton = ({ theme, toggleTheme }: Pick<NavbarProps, 'theme' | 'toggleTheme'>) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle dark/light mode"
      className="text-black hover:bg-zinc-200 dark:text-white dark:hover:bg-zinc-700"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export function Navbar({
  walletName,
  formatAmount,
  currencySymbol,
  totalBalance,
  theme,
  toggleTheme,
  isLoading = false,
}: NavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)
  const { clear: clearAuth } = useStore(authStore, (state) => state)

  const handleLogout = async () => {
    clearAuth()
    await navigate('/login')
  }

  return (
    <header className="flex items-center justify-between bg-gray-100 px-4 py-2 text-black transition-colors duration-300 dark:bg-[#23262b] dark:text-white">
      <WalletPreview
        isLoading={isLoading}
        walletName={walletName}
        totalBalance={totalBalance}
        formatAmount={formatAmount}
        currencySymbol={currencySymbol}
      />
      <div className="flex min-w-0 flex-1 items-center justify-center gap-8 text-sm">
        <Link to={routes.receive} className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_receive')}
        </Link>
        <Link to={routes.earn} className="relative cursor-pointer opacity-70 hover:underline">
          <WithActivityIndicator active={jmSessionState?.maker_running || false}>
            {t('navbar.tab_earn')}
          </WithActivityIndicator>
        </Link>
        <Link to={routes.send} className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_send')}
        </Link>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <Link to={routes.sweep} className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_sweep')}
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
        <Link to={routes.settings}>
          <Button
            aria-label={t('navbar.menu_mobile_settings')}
            className="text-black hover:bg-zinc-200 dark:text-white dark:hover:bg-zinc-700"
            variant="ghost"
            size="icon"
          >
            <Settings />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Logout"
          className="text-black hover:bg-zinc-200 dark:text-white dark:hover:bg-zinc-700"
        >
          <LogOutIcon />
        </Button>
      </div>
    </header>
  )
}
