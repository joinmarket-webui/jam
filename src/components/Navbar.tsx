import { useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { Loader2, LogOut, Moon, Settings, Sun, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import type { Jar } from '@/components/layout/display-mode-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { DevBadge } from './ui/DevBadge'
import { Skeleton } from './ui/skeleton'

interface NavbarProps {
  theme: string
  toggleTheme: () => void
  formatAmount: (amount: number) => string
  getLogo: (size: 'sm' | 'lg') => React.ReactNode
  jars: Jar[]
  isLoading?: boolean
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

export function Navbar({ theme, toggleTheme, formatAmount, getLogo, jars, isLoading = false }: NavbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)

  const handleLogout = async () => {
    authStore.getState().clear()
    await navigate('/login')
  }

  const totalBalance = useMemo(() => jars.reduce((acc, jar) => acc + jar.balance, 0), [jars])

  return (
    <header className="flex items-center justify-between bg-gray-100 px-4 py-2 text-black transition-colors duration-300 dark:bg-[#23262b] dark:text-white">
      <div className="flex flex-1 items-center">
        <Link to={'/'} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center">
            {isLoading ? (
              <Loader2 className="animate-spin text-gray-400" strokeWidth={3} />
            ) : (
              <Wallet strokeWidth={1} />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="font-semibold tracking-tight">Satoshi</div>
              <DevBadge />
            </div>
            <div className="flex min-h-6 min-w-[150px] items-center">
              {isLoading ? (
                <Skeleton className="h-4 w-full bg-neutral-200 dark:bg-neutral-600" />
              ) : (
                <>
                  <div className="tabular-nums">{formatAmount(totalBalance)}</div>
                  {getLogo('sm')}
                </>
              )}
            </div>
          </div>
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-8 text-sm">
        <Link to="/receive" className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_receive')}
        </Link>
        <Link to="/earn" className="relative cursor-pointer opacity-70 hover:underline">
          <WithActivityIndicator active={jmSessionState?.maker_running || false}>
            {t('navbar.tab_earn')}
          </WithActivityIndicator>
        </Link>
        <Link to="/send" className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_send')}
        </Link>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <Link to="/sweep" className="cursor-pointer opacity-70 hover:underline">
          {t('navbar.tab_sweep')}
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
          className="text-black hover:bg-zinc-200 dark:text-white dark:hover:bg-zinc-700"
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <Link to="/settings">
          <Button
            aria-label="Settings"
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
          <LogOut />
        </Button>
      </div>
    </header>
  )
}
