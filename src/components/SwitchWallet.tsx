import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Lock, RefreshCwIcon, Unlock, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiClient } from '@/hooks/useApiClient'
import { listwalletsOptions, lockwalletOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { clearSession } from '@/lib/session'
import { formatWalletName } from '@/lib/utils'

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

const SwitchWallet = ({ walletFileName }: { walletFileName: string }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const [currentWalletLocked, setCurrentWalletLocked] = useState(false)

  const listwalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
    retry: false,
  })

  const lockCurrentWallet = useQuery({
    ...lockwalletOptions({
      client,
      path: { walletname: walletFileName },
    }),
    enabled: false,
  })

  const isLoadingWallets = useMemo(() => listwalletsQuery.isFetching, [listwalletsQuery.isFetching])
  const listwalletsError = useMemo(() => {
    if (!listwalletsQuery.error) return undefined
    return {
      message: t('wallets.error_loading_failed'),
      error_description: listwalletsQuery.error.message || t('global.errors.reason_unknown'),
    }
  }, [listwalletsQuery.error, t])

  const wallets = useMemo(() => listwalletsQuery.data?.wallets || [], [listwalletsQuery.data])

  const handleLockCurrentWallet = async () => {
    try {
      await lockCurrentWallet.refetch()
      clearSession()
      setCurrentWalletLocked(true)
      toast.success(
        t('wallets.wallet_preview.alert_wallet_locked_successfully', { walletName: formatWalletName(walletFileName) }),
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('global.errors.reason_unknown')
      toast.error(`Failed to lock current wallet: ${errorMessage}`)
      console.error('Failed to lock wallet:', error)
    }
  }

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              {isLoadingWallets ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Wallet className="text-primary h-6 w-6" onClick={async () => await listwalletsQuery.refetch()} />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">{t('settings.button_switch_wallet')}</CardTitle>
            <CardDescription>
              {currentWalletLocked
                ? 'Current wallet is locked. Select a different wallet to continue.'
                : t('wallets.alert_wallet_open', {
                    currentWalletName: formatWalletName(walletFileName),
                  })}
            </CardDescription>
          </CardHeader>

          {isLoadingWallets ? (
            <CardContent className="space-y-6">
              <SwitchWalletFormSkeleton />
            </CardContent>
          ) : (
            <>
              {listwalletsError ? (
                <CardContent className="space-y-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{listwalletsError.message}</AlertTitle>
                    <AlertDescription>{listwalletsError.error_description}</AlertDescription>
                  </Alert>
                  <Button variant="ghost" size="sm" onClick={async () => await listwalletsQuery.refetch()}>
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                <span className="text-sm font-medium">{formatWalletName(wallet)}</span>
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
                                <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex-1">
                                  <Wallet className="mr-2 h-4 w-4" />
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
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      {t('settings.button_locking_wallet')}
                                    </>
                                  ) : currentWalletLocked ? (
                                    <>
                                      <Lock className="mr-2 h-4 w-4" />
                                      {t('wallets.wallet_preview.wallet_locked')}
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="mr-2 h-4 w-4" />
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
    </div>
  )
}

export default SwitchWallet
