import { Wallet, Sun, Moon, Settings, LogOut, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { clearSession } from '@/lib/session'
import type { Jar } from './layout/display-mode-context'

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
    <header className="flex items-center justify-between px-6 py-4 bg-gray-100 text-black dark:bg-[#23262b] dark:text-white transition-colors duration-300">
      <div className="flex items-center flex-1 min-w-0">
        <Wallet className="mr-3" strokeWidth={1} />
        <div className="flex flex-col relative">
          <span className="flex font-thin -mb-1">Satoshi</span>
          <Badge className="absolute right-3  -translate-x-1/2 -top-1 z-10" variant="dev">
            dev
          </Badge>
          <div className="text-lg font-light tracking-wider flex items-center min-h-[40px]">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <>
                <span
                  className="tabular-nums text-center select-none cursor-pointer"
                  onClick={toggleDisplayMode}
                  title="Click to toggle sats/bitcoin"
                >
                  {formatAmount(totalBalance)}
                </span>
                <span className="flex items-center min-h-[32px]">{getLogo('sm')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-8 text-sm justify-center items-center flex-1 min-w-0">
        <span className="opacity-70 cursor-pointer hover:underline">Receive</span>
        <span className="opacity-70 hover:underline cursor-pointer relative">
          <span>Earn</span>
          <span className="text-[#6ee7b7] text-[8px] absolute -top-1 -right-2">●</span>
        </span>
        <span className="opacity-70 cursor-pointer hover:underline">Send</span>
        <span className=" text-gray-400 dark:text-gray-600">|</span>
        <span className="opacity-70 cursor-pointer hover:underline">Sweep</span>
      </div>
      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
          className="text-black dark:text-white dark:hover:bg-zinc-700 hover:bg-zinc-200"
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
          className="text-black dark:text-white dark:hover:bg-zinc-700 hover:bg-zinc-200"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  )
}
