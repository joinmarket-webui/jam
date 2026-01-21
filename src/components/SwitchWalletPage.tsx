import { useMemo, useState } from 'react'
import { listwalletsOptions, lockwalletOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { AlertCircleIcon, LockIcon, RefreshCwIcon, UnlockIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { shortenStringMiddle, sortWallets, walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { Spinner } from './ui/spinner'

const SwitchWalletFormSkeleton = () => {
  return (
    <>
      <div className="flex flex-col space-y-6">
        <Skeleton className="h-4 w-full" />
        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-[75px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-[75px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div>&nbsp;</div>
      <div>&nbsp;</div>
    </>
  )
}

interface SwitchWalletPageProps {
  walletFileName: WalletFileName
}

const SwitchWalletPage = ({ walletFileName }: SwitchWalletPageProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const [currentWalletLocked, setCurrentWalletLocked] = useState(false)

  const {
    data: listWalletsData,
    error: listWalletsError,
    isLoading: listWalletsLoading,
    isFetching: listWalletsFetching,
    refetch: listWalletsRefetch,
  } = useQuery({
    ...listwalletsOptions({ client }),
    retry: false,
  })

  const lockCurrentWallet = useQuery({
    ...lockwalletOptions({
      client,
      path: { walletname: walletFileName },
    }),
    enabled: false,
    staleTime: 1,
    gcTime: 1,
    retry: false,
  })

  const listWalletsErrorAlert: ErrorMessage | undefined = useMemo(() => {
    if (!listWalletsError) return undefined
    return {
      message: t('wallets.error_loading_failed'),
      error_description: listWalletsError.message || t('global.errors.reason_unknown'),
    }
  }, [listWalletsError, t])

  const wallets = sortWallets((listWalletsData?.wallets || []) as WalletFileName[], walletFileName)

  const handleLockCurrentWallet = async () => {
    try {
      await lockCurrentWallet.refetch()
      authStore.getState().clear()
      setCurrentWalletLocked(true)
      toast.success(
        t('wallets.wallet_preview.alert_wallet_locked_successfully', { walletName: walletDisplayName(walletFileName) }),
      )
    } catch (error: unknown) {
      const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
      toast.error(/* TODO: i18n*/ `Failed to lock current wallet: ${reason}`)
      console.error('Failed to lock wallet:', error)
    }
  }

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {listWalletsFetching ? (
              <Spinner className="size-6" />
            ) : (
              <WalletIcon className="text-primary h-6 w-6" onClick={async () => await listWalletsRefetch()} />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{t('settings.button_switch_wallet')}</CardTitle>
          <CardDescription>
            {/*TODO: i18n */}
            {currentWalletLocked
              ? 'Current wallet is locked. Select a different wallet to continue.'
              : t('wallets.alert_wallet_open', {
                  currentWalletName: walletDisplayName(walletFileName),
                })}
          </CardDescription>
        </CardHeader>

        {listWalletsLoading ? (
          <CardContent className="space-y-6">
            <SwitchWalletFormSkeleton />
          </CardContent>
        ) : (
          <>
            {listWalletsErrorAlert ? (
              <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>{listWalletsErrorAlert.message}</AlertTitle>
                  <AlertDescription>{listWalletsErrorAlert.error_description}</AlertDescription>
                </Alert>
                <Button variant="ghost" size="sm" onClick={async () => await listWalletsRefetch()}>
                  <RefreshCwIcon className="h-4 w-4" /> {t('global.retry')}
                </Button>
              </CardContent>
            ) : (
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('wallets.title')}</span>
                  </div>

                  {wallets.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-muted-foreground text-sm">{t('wallets.subtitle_no_wallets')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {wallets.map((wallet, index) => (
                        <div
                          key={index}
                          className={`rounded-lg border p-4 ${
                            wallet === walletFileName ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between truncate">
                            <div className="flex items-center gap-2">
                              <WalletIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {shortenStringMiddle(walletDisplayName(wallet) ?? '...', 63)}
                              </span>
                            </div>
                            {wallet === walletFileName && (
                              <span className="text-muted-foreground text-xs">
                                {currentWalletLocked
                                  ? t('wallets.wallet_preview.wallet_locked')
                                  : t('wallets.wallet_preview.wallet_active')}
                              </span>
                            )}
                          </div>

                          {wallet === walletFileName && (
                            <div className="m-4 flex gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(routes.home)}
                                className="flex-1"
                              >
                                <WalletIcon className="mr-2 h-4 w-4" />
                                {t('wallets.wallet_preview.button_open')}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={handleLockCurrentWallet}
                                disabled={lockCurrentWallet.isFetching || currentWalletLocked}
                                className="flex-1"
                              >
                                {lockCurrentWallet.isFetching ? (
                                  <>
                                    <Spinner className="motion-reduce:hidden" />
                                    {t('settings.button_locking_wallet')}
                                  </>
                                ) : currentWalletLocked ? (
                                  <>
                                    <LockIcon className="h-4 w-4" />
                                    {t('wallets.wallet_preview.wallet_locked')}
                                  </>
                                ) : (
                                  <>
                                    <UnlockIcon className="h-4 w-4" />
                                    {t('settings.button_lock_wallet')}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

export default SwitchWalletPage
