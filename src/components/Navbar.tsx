import { Loader2, LogOut, Moon, Settings, Sun, Wallet } from 'lucide-react'
import type { Jar } from '@/components/layout/display-mode-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { clearSession } from '@/lib/session'

interface NavbarProps {
  theme: string
  toggleTheme: () => void
  toggleDisplayMode: () => void
  formatAmount: (amount: number) => string
  getLogo: (size: 'sm' | 'lg') => React.ReactNode
  jars: Jar[]
  isLoading?: boolean
}

export function Navbar({
  theme,
  toggleTheme,
  toggleDisplayMode,
  formatAmount,
  getLogo,
  jars,
  isLoading = false,
}: NavbarProps) {
  const handleLogout = () => {
    clearSession()
    window.location.href = '/login'
  }

  const totalBalance = jars.reduce((acc, jar) => acc + jar.balance, 0)

  return (
    <header className="flex items-center justify-between bg-gray-100 px-6 py-4 text-black transition-colors duration-300 dark:bg-[#23262b] dark:text-white">
      <div className="flex min-w-0 flex-1 items-center">
        <Wallet className="mr-3" strokeWidth={1} />
        <div className="relative flex flex-col">
          <span className="-mb-1 flex font-thin">Satoshi</span>
          <Badge className="absolute -top-1 right-3 z-10 -translate-x-1/2" variant="dev">
            dev
          </Badge>
          <div className="flex min-h-[40px] items-center text-lg font-light tracking-wider">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <>
                <span
                  className="cursor-pointer text-center tabular-nums select-none"
                  onClick={toggleDisplayMode}
                  title="Click to toggle sats/bitcoin"
                >
                  {formatAmount(totalBalance)}
                </span>
                <span className="flex min-h-[32px] items-center">{getLogo('sm')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-8 text-sm">
        <span className="cursor-pointer opacity-70 hover:underline">Receive</span>
        <span className="relative cursor-pointer opacity-70 hover:underline">
          <span>Earn</span>
          <span className="absolute -top-1 -right-2 text-[8px] text-[#6ee7b7]">●</span>
        </span>
        <span className="cursor-pointer opacity-70 hover:underline">Send</span>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <span className="cursor-pointer opacity-70 hover:underline">Sweep</span>
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
        <Button variant="ghost" size="icon" className="text-black dark:text-white">
          <Settings />
        </Button>
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
