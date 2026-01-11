import { useMemo, useState } from 'react'
import {
  listwalletsOptions,
  unlockwalletMutation,
  sessionOptions,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2Icon,
  Lock,
  RefreshCwIcon,
  Wallet,
  WalletIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { sortWallets, walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore, type AuthState } from '@/store/authStore'
import { Badge } from './ui/badge'

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

interface WalletListItemProps {
  wallet: WalletFileName
  isActive: boolean
  hasAuthToken: boolean
  showPasswordInput: boolean
  password: string
  setPassword: (password: string) => void
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  isSubmitting: boolean
  onOpenWithToken: (wallet: WalletFileName) => Promise<void>
  onSubmitWithPassword: (wallet: WalletFileName, password: string) => Promise<void>
  t: (key: string) => string
}

const WalletListItem = ({
  wallet,
  isActive,
  hasAuthToken,
  showPasswordInput,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isSubmitting,
  onOpenWithToken,
  onSubmitWithPassword,
  t,
}: WalletListItemProps) => {
  const [isSubmittingThisWallet, setIsSubmittingThisWallet] = useState(false)

  const handleOpen = async () => {
    if (hasAuthToken && isActive) {
      setIsSubmittingThisWallet(true)
      try {
        await onOpenWithToken(wallet)
      } finally {
        setIsSubmittingThisWallet(false)
      }
    } else {
      if (!showPasswordInput) {
        onOpenWithToken(wallet)
        return
      }

      if (!password) {
        toast.error(t('wallets.wallet_preview.feedback_missing_password'))
        return
      }
      setIsSubmittingThisWallet(true)
      try {
        await onSubmitWithPassword(wallet, password)
      } finally {
        setIsSubmittingThisWallet(false)
      }
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 ${isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{walletDisplayName(wallet)}</span>
        </div>
        {isActive && (
          <Badge variant="secondary" className="text-xs">
            {t('wallets.wallet_preview.wallet_active')}
          </Badge>
        )}
      </div>

      {showPasswordInput && (
        <div className="mb-3 space-y-2">
          <Label htmlFor={`password-${wallet}`} className="text-xs">
            {t('wallets.wallet_preview.placeholder_password')}
          </Label>
          <div className="relative">
            <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              id={`password-${wallet}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isSubmittingThisWallet}
              placeholder={t('wallets.wallet_preview.placeholder_password')}
              className="pr-10 pl-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password) {
                  handleOpen()
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 transform"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={handleOpen}
        disabled={isSubmitting || isSubmittingThisWallet || (showPasswordInput && !password)}
        className="w-full"
        size="sm"
        variant={isActive ? 'default' : 'outline'}
      >
        {isSubmittingThisWallet ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin motion-reduce:hidden" />
            {t('wallets.wallet_preview.button_unlocking')}
          </>
        ) : hasAuthToken && isActive ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t('wallets.wallet_preview.button_open')}
          </>
        ) : (
          <>
            <WalletIcon className="mr-2 h-4 w-4" />
            {t('wallets.wallet_preview.button_unlock')}
          </>
        )}
      </Button>
    </div>
  )
}

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateAuthState = useStore(authStore, (state) => state.update)
  const currentAuthState = useStore(authStore, (state) => state.state)
  const client = useApiClient()

  const [selectedWallet, setSelectedWallet] = useState<WalletFileName | undefined>()
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showServiceWarning, setShowServiceWarning] = useState<boolean>(false)
  const [walletToSwitch, setWalletToSwitch] = useState<WalletFileName | undefined>()

  const listwalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
    retry: false,
  })

  const sessionQuery = useQuery({
    ...sessionOptions({ client }),
    retry: false,
    refetchInterval: 5000,
  })

  const isLoadingWallets = useMemo(() => listwalletsQuery.isFetching, [listwalletsQuery.isFetching])
  const listwalletsError = useMemo(() => {
    if (!listwalletsQuery.error) return undefined
    return {
      message: t('wallets.error_loading_failed'),
      error_description: listwalletsQuery.error.message || 'Unknown reason.',
    }
  }, [t, listwalletsQuery.error])

  const sessionData = sessionQuery.data as SessionResponse | undefined

  const wallets = useMemo(() => {
    const values = (listwalletsQuery.data?.wallets || []) as WalletFileName[]
    const activeWalletName = sessionData?.wallet_name
    const activeWallet =
      activeWalletName && activeWalletName !== 'None' ? (activeWalletName as WalletFileName) : undefined
    return activeWallet ? sortWallets(values, activeWallet) : values
  }, [listwalletsQuery.data, sessionData])

  const activeWalletName = useMemo(() => {
    const walletName = sessionData?.wallet_name
    return walletName && walletName !== 'None' ? (walletName as WalletFileName) : undefined
  }, [sessionData])

  const hasActiveServices = useMemo(() => {
    return sessionData?.maker_running === true || sessionData?.coinjoin_in_process === true
  }, [sessionData])

  const walletHasAuthToken = (wallet: WalletFileName): boolean => {
    return (
      currentAuthState?.walletFileName === wallet &&
      currentAuthState?.auth?.token !== undefined &&
      currentAuthState?.auth?.refresh_token !== undefined
    )
  }

  const unlockWallet = useMutation({
    ...unlockwalletMutation({ client }),
    retry: false,
  })

  const performLogin = async (walletFileName: WalletFileName, password: string) => {
    const response = await unlockWallet.mutateAsync({
      path: {
        walletname: encodeURIComponent(walletFileName),
      },
      body: {
        password,
      },
    })

    let hashedPassword: string | undefined
    try {
      hashedPassword = hashPassword(password, walletFileName)
    } catch (hashError) {
      console.warn('Failed to hash password, continuing without hash verification:', hashError)
    }

    const authState: AuthState = {
      walletFileName: response.walletname as WalletFileName,
      auth: { token: response.token, refresh_token: response.refresh_token },
      hashed_password: hashedPassword,
    }

    updateAuthState(authState)
    toast.success(
      t('wallets.wallet_preview.alert_wallet_already_unlocked', { walletName: walletDisplayName(walletFileName) }),
    )
    await navigate('/')
  }

  const loginWithPassword = async (walletFileName: WalletFileName, password: string) => {
    if (activeWalletName && activeWalletName !== walletFileName && hasActiveServices) {
      setWalletToSwitch(walletFileName)
      setShowServiceWarning(true)
      return
    }

    await performLogin(walletFileName, password)
  }

  const loginWithToken = async (walletFileName: WalletFileName) => {
    if (activeWalletName && activeWalletName !== walletFileName && hasActiveServices) {
      setWalletToSwitch(walletFileName)
      setShowServiceWarning(true)
      return
    }

    if (walletHasAuthToken(walletFileName) && activeWalletName === walletFileName) {
      await navigate('/')
      return
    }

    setSelectedWallet(walletFileName)
    setPassword('')
  }

  const confirmSwitchWithWarning = async () => {
    setShowServiceWarning(false)
    if (walletToSwitch) {
      if (password) {
        await performLogin(walletToSwitch, password)
      } else if (walletHasAuthToken(walletToSwitch)) {
        await navigate('/')
      }
      setWalletToSwitch(undefined)
      setPassword('')
    }
  }

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              {isLoadingWallets ? (
                <Loader2Icon className="h-6 w-6 animate-spin" />
              ) : (
                <Wallet className="text-primary h-6 w-6" onClick={async () => await listwalletsQuery.refetch()} />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Jam</CardTitle>
            {!isLoadingWallets && wallets !== undefined && (
              <CardDescription>
                {wallets.length > 0
                  ? activeWalletName
                    ? t('wallets.alert_wallet_open', { currentWalletName: walletDisplayName(activeWalletName) })
                    : 'Select a wallet and enter your password to continue.'
                  : t('wallets.subtitle_no_wallets')}
              </CardDescription>
            )}
          </CardHeader>

          {isLoadingWallets ? (
            <CardContent className="space-y-6">
              <LoginFormSkeleton />
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
                    <RefreshCwIcon className="h-4 w-4" />
                    {t('global.retry')}
                  </Button>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {wallets !== undefined && wallets.length === 0 ? (
                    <>
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">{t('wallets.subtitle_no_wallets')}</p>
                      </div>
                      <div className="flex flex-col gap-4">
                        <Button size="lg" onClick={async () => await navigate('/create-wallet')}>
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
                      {showServiceWarning && hasActiveServices && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>
                            {sessionData?.maker_running
                              ? t('wallets.wallet_preview.modal_lock_wallet_maker_running_text')
                              : t('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')}
                          </AlertTitle>
                          <AlertDescription>
                            {t('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')}
                          </AlertDescription>
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" onClick={confirmSwitchWithWarning} disabled={unlockWallet.isPending}>
                              {t('modal.confirm_button_accept')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowServiceWarning(false)
                                setWalletToSwitch(undefined)
                                setPassword('')
                              }}
                            >
                              {t('modal.confirm_button_reject')}
                            </Button>
                          </div>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('wallets.title')}</span>
                        </div>

                        <div className="space-y-2">
                          {wallets.map((wallet, index) => {
                            const isActive = activeWalletName === wallet
                            const hasAuthToken = walletHasAuthToken(wallet)
                            const showPasswordInput =
                              selectedWallet === wallet && (!isActive || (isActive && !hasAuthToken))

                            return (
                              <WalletListItem
                                key={index}
                                wallet={wallet}
                                isActive={isActive}
                                hasAuthToken={hasAuthToken && isActive}
                                showPasswordInput={showPasswordInput}
                                password={password}
                                setPassword={setPassword}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                                isSubmitting={unlockWallet.isPending}
                                onOpenWithToken={loginWithToken}
                                onSubmitWithPassword={loginWithPassword}
                                t={t}
                              />
                            )
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={async () => await navigate('/create-wallet')}
                          className="cursor-pointer"
                        >
                          {t('wallets.button_new_wallet')}
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={async () => await navigate('/create-wallet')}
                          disabled
                        >
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
    </div>
  )
}

export default LoginPage
