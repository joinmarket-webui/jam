import { Info, Loader2, RefreshCw } from 'lucide-react'

import { Jar } from './layout/Jar'
import { useJamDisplayContext } from './layout/display-mode-context'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export default function JamLanding() {
  const {
    displayMode,
    toggleDisplayMode,
    formatAmount,
    getLogo,
    jars,
    totalBalance,
    isLoading,
    error,
    refetchWalletData,
  } = useJamDisplayContext()

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-8 text-center">
        <div className="text-lg text-gray-400 opacity-80">{displayMode === 'btc' ? 'Bitcoin' : 'Satoshi'}</div>
        <div className="mb-2 flex min-h-[56px] cursor-pointer items-center justify-center text-4xl font-light tracking-wider select-none">
          {isLoading ? (
            <div className="flex min-h-[56px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <span
                onClick={toggleDisplayMode}
                title="Click to toggle sats/bitcoin"
                className="min-w-[250px] text-center tabular-nums"
              >
                {formatAmount(totalBalance)}{' '}
              </span>
              <span className="flex min-h-[48px] items-center">{getLogo('lg')}</span>
            </>
          )}
        </div>
        <div className="mt-10 flex justify-center gap-4">
          <Button className="cursor-pointer px-12">↓ Receive</Button>
          <Button className="cursor-pointer px-16" variant="outline">
            ↑ Send
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4 max-w-2xl">
          <AlertDescription>
            Error loading wallet data: {error.message}
            <Button variant="outline" size="sm" onClick={() => refetchWalletData()} className="ml-2">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card className="mb-8 w-full max-w-2xl border-0 p-6 text-black shadow-none dark:bg-[#181b20] dark:text-white">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex w-full items-center justify-center">
            <span className="font-light opacity-80">Wallet distribution</span>
            <div className="mx-3 text-black opacity-80 dark:text-white">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} />
                </TooltipTrigger>
                <TooltipContent>Select a jar to get started</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4">
          {isLoading ? (
            <div className="flex flex-1 justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : jars.length > 0 ? (
            jars.map((jar) => (
              <Tooltip key={jar.name}>
                <TooltipTrigger asChild>
                  <div className="flex cursor-pointer flex-col items-center transition-all duration-300 hover:scale-105">
                    <Jar
                      name={jar.name}
                      amount={jar.balance}
                      color={jar.color}
                      displayMode={displayMode}
                      totalBalance={totalBalance}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Open {jar.name} Jar</TooltipContent>
              </Tooltip>
            ))
          ) : (
            <div className="flex-1 py-4 text-center text-gray-500">No accounts found in wallet</div>
          )}
        </div>
      </Card>
      <div className="flex w-full max-w-2xl justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetchWalletData()}
          className="flex items-center gap-2 text-gray-500"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  )
}
