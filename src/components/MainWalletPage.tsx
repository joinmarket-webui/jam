import { useState } from 'react'
import { DownloadIcon, InfoIcon, RefreshCwIcon, UploadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ClickableJar } from '@/components/ui/jam/ClickableJar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { routes } from '@/constants/routes'
import { useJamDisplayContext } from '@/context/JamDisplayContext'
import {
  useJamWalletInfoContext,
  useJars,
  useWalletBalanceSummary,
  type Jar as JarObject,
} from '@/context/JamWalletInfoContext'
import type { WalletFileName } from '@/lib/utils'
import { cn, shortenStringMiddle, walletDisplayName } from '@/lib/utils'
import { Balance } from './ui/jam/Balance'
import { Spinner } from './ui/spinner'
import { WalletJarsDetailsOverlay } from './wallet/WalletJarsDetailsOverlay'

interface MainWalletPageProps {
  walletFileName: WalletFileName
}

export default function MainWalletPage({ walletFileName }: MainWalletPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedJar, setSelectedJar] = useState<JarObject>()
  const [isWalletJarsDetailsOpen, setIsWalletJarsDetailsOpen] = useState(false)

  const { toggleDisplayMode } = useJamDisplayContext()
  const { isLoading, isFetching, error, refetch: refetchWalletData } = useJamWalletInfoContext()
  const { walletBalanceSummary } = useWalletBalanceSummary()
  const { jars } = useJars()

  const walletName = walletDisplayName(walletFileName)
  const walletNameTitle = shortenStringMiddle(walletName, 32)

  const onJarClicked = (jar: JarObject) => {
    setSelectedJar(jar)
    setIsWalletJarsDetailsOpen(true)
  }

  return (
    <>
      <WalletJarsDetailsOverlay
        open={isWalletJarsDetailsOpen}
        onOpenChange={(open) => {
          setIsWalletJarsDetailsOpen(open)
          setSelectedJar((current) => (open ? current : undefined))
        }}
        walletFileName={walletFileName}
        selectedJarIndex={selectedJar?.jarIndex}
      />
      <div className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="flex w-full max-w-xl flex-col items-center justify-center gap-2">
          <p className="text-muted-foreground hover:text-foreground text-xl select-all" title={walletName}>
            {walletNameTitle}
          </p>

          <div className="flex min-h-[56px] items-center justify-center">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="motion-reduce:hidden" />
                {t('global.loading')}
              </div>
            ) : (
              <div
                onClick={() => toggleDisplayMode()}
                className="flex cursor-pointer items-center text-4xl tracking-wider"
              >
                <Balance
                  valueString={String(walletBalanceSummary.calculatedTotalBalanceInSats)}
                  enableVisibilityToggle={false}
                />
              </div>
            )}
          </div>
          <div className="mt-2 flex w-full justify-center gap-4" data-tour-id="wallet-actions">
            <Button size="xxl" className="flex-1" variant="default" onClick={() => void navigate(routes.receive)}>
              <DownloadIcon />
              {t('current_wallet.button_deposit')}
            </Button>
            <Button size="xxl" className="flex-1" variant="outline" onClick={() => void navigate(routes.send)}>
              <UploadIcon />
              {t('current_wallet.button_withdraw')}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 max-w-xl">
            <AlertDescription>
              {t('global.errors.error_loading_wallet_failed', {
                reason: error.message || t('global.errors.reason_unknown'),
              })}
              <Button variant="outline" size="sm" onClick={() => void refetchWalletData()}>
                <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
                {t('global.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="light:text-black mt-8 mb-4 flex w-full flex-col gap-8 text-white" data-tour-id="wallet-jars">
          <div className="text-muted-foreground hover:text-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex w-full cursor-help items-center justify-center gap-2 select-none">
                  <span className="text-sm font-light tracking-wide">{t('current_wallet.jars_title')}</span>
                  <InfoIcon size={16} className="cursor-help" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('current_wallet.jars_title_popover')}</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex min-h-[128px] items-center justify-center gap-4">
            {isFetching ? (
              <div className="flex flex-1 items-center justify-center gap-2 py-8">
                <Spinner className="motion-reduce:hidden" />
                {t('global.loading')}
              </div>
            ) : (
              <div className="flex max-w-xl flex-1 flex-col flex-wrap items-center justify-center gap-8 sm:max-w-xl sm:flex-row sm:gap-x-24 lg:max-w-6xl lg:gap-x-8">
                {jars.map((jar, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center transition-all duration-300 hover:scale-105">
                        <ClickableJar
                          className="cursor-zoom-in"
                          name={jar.name}
                          totalBalance={jar.balanceSummary.calculatedTotalBalanceInSats}
                          availableBalance={jar.balanceSummary.calculatedAvailableBalanceInSats}
                          frozenOrLockedBalance={jar.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
                          color={jar.color}
                          totalWalletBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                          onClick={() => onJarClicked(jar)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={3}>{t('current_wallet.jar_tooltip')}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full max-w-xl justify-end">
          <Button variant="ghost" size="xs" onClick={() => void refetchWalletData()}>
            <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': isFetching })} />
            {t('global.refresh')}
          </Button>
        </div>
      </div>
    </>
  )
}
