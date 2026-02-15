import { useEffect, useState, type ComponentProps } from 'react'
import type { ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { AlertCircleIcon, RefreshCwIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { routes } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { LoginForm } from './LoginForm'
import { OnboardingDialog } from './OnboardingDialog'

type LoginFormProps = ComponentProps<typeof LoginForm>
type LoginCardProps = Omit<LoginFormProps, 'loading' | 'onSubmit'> &
  Required<Pick<LoginFormProps, 'onSubmit'>> & {
    isSubmitting: boolean
    listWalletsFetching: boolean
    listWalletsLoading: boolean
    listWalletsError?: ErrorMessage
    onReloadClick: () => Promise<void>
  }

const ONBOARDING_DISMISSED_STORAGE_KEY = 'jam:v2:onboarding:dismissed'

export const LoginCard = ({
  wallets,
  activeWallet,
  makerRunning,
  coinjoinInProgress,
  onSubmit,
  isSubmitting,
  listWalletsLoading,
  listWalletsFetching,
  listWalletsError,
  onReloadClick,
}: LoginCardProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    try {
      const isDismissed = window.localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) === '1'
      if (!isDismissed) {
        setShowOnboarding(true)
      }
    } catch (error) {
      console.warn('Failed to access onboarding preference:', error)
    }
  }, [])

  const onOnboardingOpenChange = (open: boolean) => {
    setShowOnboarding(open)
    if (!open) {
      try {
        window.localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, '1')
      } catch (error) {
        console.warn('Failed to persist onboarding preference:', error)
      }
    }
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {listWalletsFetching ? (
              <Spinner className="size-6" />
            ) : (
              <WalletIcon className="text-primary" onClick={() => void onReloadClick()} />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{/*TODO: i18n */}Welcome to Jam</CardTitle>
          {listWalletsLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
            </>
          ) : wallets && wallets.length > 0 ? (
            <CardDescription>{/*TODO: i18n */}Select a wallet and enter your password to continue.</CardDescription>
          ) : undefined}
          <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setShowOnboarding(true)}>
            {t('onboarding.splashscreen_button_get_started')}
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {listWalletsError ? (
            <>
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>{t('wallets.error_loading_failed')}</AlertTitle>
                <AlertDescription>{listWalletsError.message || t('global.errors.reason_unknown')}</AlertDescription>
              </Alert>
              <Button variant="ghost" size="sm" onClick={() => void onReloadClick()} disabled={listWalletsFetching}>
                <RefreshCwIcon className={cn({ 'motion-safe:animate-spin': listWalletsFetching })} />
                {t('global.retry')}
              </Button>
            </>
          ) : (
            <>
              {wallets === undefined || listWalletsLoading ? (
                <>
                  <LoginForm loading />
                  <div className="flex flex-col gap-2">
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                  </div>
                </>
              ) : (
                <>
                  {wallets && wallets.length === 0 ? (
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm">{t('wallets.subtitle_no_wallets')}</p>
                    </div>
                  ) : (
                    <LoginForm
                      wallets={wallets}
                      activeWallet={activeWallet}
                      makerRunning={makerRunning ?? false}
                      coinjoinInProgress={coinjoinInProgress ?? false}
                      disabled={isSubmitting || listWalletsFetching}
                      onSubmit={onSubmit}
                    />
                  )}

                  <div className="flex flex-col gap-2">
                    <Button
                      variant={wallets.length === 0 ? 'default' : 'link'}
                      size={wallets.length === 0 ? 'xxl' : 'default'}
                      onClick={() => void navigate(routes.createWallet)}
                    >
                      {t('wallets.button_new_wallet')}
                    </Button>
                    <Button
                      variant={wallets.length === 0 ? 'secondary' : 'link'}
                      size={wallets.length === 0 ? 'xxl' : 'default'}
                      onClick={() => void navigate('/import-wallet')}
                      disabled
                    >
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

      <OnboardingDialog open={showOnboarding} onOpenChange={onOnboardingOpenChange} />
    </>
  )
}
