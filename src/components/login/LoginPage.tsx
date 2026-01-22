import { useState } from 'react'
import { listwalletsOptions, unlockwalletMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircleIcon, EyeIcon, EyeOffIcon, LockIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, shortenStringMiddle, walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore, type AuthState } from '@/store/authStore'

const LoginFormSkeleton = () => {
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

interface LoginFormData {
  walletFileName: WalletFileName
  password: string
}

interface LoginFormProps {
  wallets: WalletFileName[]
  disabled: boolean
  isSubmitting: boolean
  onSubmit: (val: LoginFormData) => Promise<void>
}

const LoginForm = ({ wallets, isSubmitting, onSubmit, disabled }: LoginFormProps) => {
  const { t } = useTranslation()
  const [selectedWallet, setSelectedWallet] = useState<WalletFileName>()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (wallets.length === 1 && selectedWallet !== wallets[0]) {
    setSelectedWallet(wallets[0])
  }

  return (
    <>
      {/* TODO: use react-hook-form and yup schema */}
      <form
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault()

          if (!selectedWallet) return

          onSubmit({ walletFileName: selectedWallet, password })
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="wallet-select">{/* TODO: i18n */}Wallet</Label>
          <Select
            value={selectedWallet ?? ''}
            onValueChange={(it) => setSelectedWallet(it as WalletFileName)}
            disabled={disabled || isSubmitting || wallets.length === 0}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={/* TODO: i18n */ wallets.length > 0 ? 'Select a wallet' : 'No wallets found.'}
              />
            </SelectTrigger>
            <SelectContent>
              {wallets?.map((wallet, index) => (
                <SelectItem key={index} value={wallet}>
                  {shortenStringMiddle(walletDisplayName(wallet), 32)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{/* TODO: i18n */}Password</Label>
          <div className="relative">
            <LockIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 transform" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={disabled || isSubmitting}
              placeholder={t('wallets.wallet_preview.placeholder_password')}
              className="pr-10 pl-10"
            />
            <Button
              tabIndex={-1}
              type="button"
              variant="link"
              size="icon"
              className="absolute top-1/2 right-0 -translate-y-1/2 transform"
              onClick={() => setShowPassword((val) => !val)}
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={disabled || isSubmitting || !selectedWallet} size="lg">
          {isSubmitting ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t('wallets.wallet_preview.button_unlocking')}
            </>
          ) : (
            <>{t('wallets.wallet_preview.button_unlock')}</>
          )}
        </Button>
      </form>
    </>
  )
}

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateAuthState = useStore(authStore, (state) => state.update)
  const client = useApiClient()

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
      delayAfter: 210,
    }),
  })

  const wallets = (listWalletsData?.wallets ?? []) as WalletFileName[]

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
              <WalletIcon className="text-primary" onClick={async () => await listWalletsRefetch()} />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{/*TODO: i18n */}Welcome to Jam</CardTitle>
          {!listWalletsLoading && wallets.length > 0 && (
            <CardDescription>{/*TODO: i18n */}Select a wallet and enter your password to continue.</CardDescription>
          )}
        </CardHeader>

        {listWalletsLoading ? (
          <CardContent className="space-y-6">
            <LoginFormSkeleton />
          </CardContent>
        ) : (
          <>
            {listWalletsError ? (
              <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>{t('wallets.error_loading_failed')}</AlertTitle>
                  <AlertDescription>
                    {JSON.stringify(listWalletsError.error_description)}
                    {listWalletsError.message || t('global.errors.reason_unknown')}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => await listWalletsRefetch()}
                  disabled={listWalletsFetching}
                >
                  <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': listWalletsFetching })} />
                  {t('global.retry')}
                </Button>
              </CardContent>
            ) : (
              <CardContent className="space-y-6">
                {wallets.length === 0 ? (
                  <>
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">{t('wallets.subtitle_no_wallets')}</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <Button size="lg" onClick={async () => await navigate(routes.createWallet)}>
                        {t('wallets.button_new_wallet')}
                      </Button>
                      <Button variant="secondary" size="lg" disabled>
                        {t('wallets.button_import_wallet')}
                        <Badge variant="destructive">Not yet implemented.</Badge>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <LoginForm
                      wallets={wallets || []}
                      disabled={login.isPending || listWalletsFetching}
                      isSubmitting={login.isPending}
                      onSubmit={handleSubmit}
                    />

                    <div className="flex flex-col gap-2">
                      <Button variant="link" size="sm" onClick={async () => await navigate(routes.createWallet)}>
                        {t('wallets.button_new_wallet')}
                      </Button>
                      <Button variant="link" size="sm" onClick={async () => await navigate('/import-wallet')} disabled>
                        {/* TODO: implement "import wallet" */}
                        {t('wallets.button_import_wallet')}
                        <Badge variant="destructive">Not yet implemented.</Badge>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

export default LoginPage
