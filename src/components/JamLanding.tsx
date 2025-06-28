import { Info, Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Jar } from '@/components/layout/Jar'
import { useJamDisplayContext } from '@/components/layout/display-mode-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function JamLanding() {
  const { t } = useTranslation()
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
                title={displayMode === 'btc' ? t('settings.use_sats') : t('settings.use_btc')}
                className="text-center tabular-nums"
              >
                {formatAmount(totalBalance)}{' '}
              </span>
              <span className="flex min-h-[48px] items-center">{getLogo('lg')}</span>
            </>
          )}
        </div>
        <div className="mt-10 flex justify-center gap-4">
          <Button className="cursor-pointer px-12">↓ {t('current_wallet.button_deposit')}</Button>
          <Button className="cursor-pointer px-16" variant="outline">
            ↑ {t('current_wallet.button_withdraw')}
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4 max-w-2xl">
          <AlertDescription>
            {t('global.errors.error_loading_wallet_failed', {
              reason: error.message || t('global.errors.reason_unknown'),
            })}
            <Button variant="outline" size="sm" onClick={() => refetchWalletData()} className="ml-2">
              <RefreshCw className="mr-2 h-4 w-4" /> {t('global.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card className="mb-8 w-full max-w-2xl border-0 p-6 text-black shadow-none dark:bg-[#181b20] dark:text-white">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex w-full items-center justify-center">
            <span className="font-light opacity-80">{t('current_wallet.jars_title')}</span>
            <div className="mx-3 text-black opacity-80 dark:text-white">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} />
                </TooltipTrigger>
                <TooltipContent>{t('current_wallet.jars_title_popover')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-4">
          {isLoading ? (
            <div className="flex flex-1 justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
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
                <TooltipContent>{t('current_wallet.jar_tooltip')}</TooltipContent>
              </Tooltip>
            ))
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
          {t('global.refresh')}
        </Button>
      </div>
    </div>
  )
}
