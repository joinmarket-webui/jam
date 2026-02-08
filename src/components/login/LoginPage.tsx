import { listwalletsOptions, unlockwalletMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircleIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, sortWallets } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore, type AuthState } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { LoginForm } from './LoginForm'

interface LoginFormData {
  walletFileName: WalletFileName
  password: string
}

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateAuthState = useStore(authStore, (state) => state.update)
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)

  const makerRunning = jmSession?.maker_running === true
  const coinjoinInProgress = jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0

  const listwalletsQueryOptions = listwalletsOptions({ client })

  const {
    data: listWalletsData,
    error: listWalletsError,
    isLoading: listWalletsLoading,
    isFetching: listWalletsFetching,
    refetch: listWalletsRefetch,
  } = useQuery({
    ...listwalletsQueryOptions,
    queryFn: withQueryDelay(listwalletsQueryOptions.queryFn, {
      throttle: 210,
    }),
  })

  const activeWalletOrNull =
    jmSession?.wallet_name !== undefined && jmSession.wallet_name !== 'None'
      ? (jmSession?.wallet_name as WalletFileName)
      : null
  const wallets = sortWallets((listWalletsData?.wallets || []) as WalletFileName[], activeWalletOrNull)

  const unlockWallet = useMutation({
    ...unlockwalletMutation({ client }),
    retry: false,
  })

  const login = useMutation<AuthState, Error, LoginFormData, unknown>({
    mutationFn: async (data: LoginFormData) => {
      const response = await unlockWallet.mutateAsync({
        path: {
          walletname: encodeURIComponent(data.walletFileName),
        },
        body: {
          password: data.password,
        },
      })

      let hashedPassword: string | undefined
      try {
        hashedPassword = await hashPassword(data.password, data.walletFileName)
      } catch (hashError) {
        console.warn('Failed to hash password, continuing without hash verification:', hashError)
      }
      return {
        walletFileName: response.walletname as WalletFileName,
        auth: { token: response.token, refresh_token: response.refresh_token },
        hashed_password: hashedPassword,
      }
    },
    onSuccess: () => {
      /* TODO: i18n */
      toast.success('Successfully unlocked wallet.')
    },
    onError: (error) => {
      /* TODO: i18n */
      toast.error(`Failed to unlock wallet: ${error.message || t('global.errors.reason_unknown')}`)
    },
  })

  const handleSubmit = async (data: LoginFormData) => {
    try {
      const authState: AuthState = await login.mutateAsync(data)
      updateAuthState(authState)
      await navigate(routes.home)
    } catch (error: unknown) {
      console.error('Error unlocking wallet', error)
    }
  }

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {listWalletsFetching ? (
              <Spinner className="size-6" />
            ) : (
              <WalletIcon className="text-primary" onClick={() => void listWalletsRefetch()} />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{/*TODO: i18n */}Welcome to Jam</CardTitle>
          {listWalletsLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
            </>
          ) : wallets.length > 0 ? (
            <CardDescription>{/*TODO: i18n */}Select a wallet and enter your password to continue.</CardDescription>
          ) : undefined}
        </CardHeader>

        <CardContent className="space-y-6">
          {listWalletsError ? (
            <>
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{t('wallets.error_loading_failed')}</AlertTitle>
                <AlertDescription>{listWalletsError.message || t('global.errors.reason_unknown')}</AlertDescription>
              </Alert>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void listWalletsRefetch()}
                disabled={listWalletsFetching}
              >
                <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': listWalletsFetching })} />
                {t('global.retry')}
              </Button>
            </>
          ) : (
            <>
              {listWalletsLoading ? (
                <>
                  <LoginForm loading />
                  <div className="flex flex-col gap-2">
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                  </div>
                </>
              ) : (
                <>
                  {wallets.length === 0 ? (
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">{t('wallets.subtitle_no_wallets')}</p>
                    </div>
                  ) : (
                    <LoginForm
                      wallets={wallets}
                      activeWallet={activeWalletOrNull ?? undefined}
                      makerRunning={makerRunning}
                      coinjoinInProgress={coinjoinInProgress}
                      disabled={login.isPending || listWalletsFetching}
                      onSubmit={handleSubmit}
                    />
                  )}

                  <div className="flex flex-col gap-2">
                    <Button variant="link" size="sm" onClick={() => void navigate(routes.createWallet)}>
                      {t('wallets.button_new_wallet')}
                    </Button>
                    <Button variant="link" size="sm" onClick={() => void navigate('/import-wallet')} disabled>
                      {/* TODO: implement "import wallet" */}
                      {t('wallets.button_import_wallet')}
                      <Badge variant="destructive">Not yet implemented.</Badge>
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
