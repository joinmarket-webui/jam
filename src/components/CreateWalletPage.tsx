import React, { useState } from 'react'
import { type CreateWalletResponse, createwallet, session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { AlertCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, WalletIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { walletDisplayName, JM_WALLET_FILE_EXTENSION, walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import PreventLeavingPageByMistake from './utils/PreventLeavingPageByMistake'

const MAX_WALLET_NAME_LENGTH = 240 - JM_WALLET_FILE_EXTENSION.length
const validateWalletName = (input: string) =>
  input.length > 0 && input.length <= MAX_WALLET_NAME_LENGTH && /^[\w-]+$/.test(input)

interface SeedPhraseContentProps {
  seedphrase: string[]
  onConfirm: () => Promise<void>
}
const SeedPhraseContent = ({ seedphrase, onConfirm }: SeedPhraseContentProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-muted rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {seedphrase.map((word, index) => (
            <div key={index} className="bg-background flex items-center gap-2 rounded-lg border p-2">
              <span className="text-muted-foreground inline-block min-w-7 text-right">{index + 1}.</span>
              {word}
            </div>
          ))}
        </div>
      </div>

      <Alert>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>
          {/* TODO: i18n */}
          <strong>Important:</strong> Write down this seed phrase and store it safely. It's the only way to recover your
          wallet if you lose access.
        </AlertDescription>
      </Alert>

      <Button onClick={async () => await onConfirm()} className="w-full" size="lg">
        {/* TODO: i18n */}I have saved my seed phrase
      </Button>
    </div>
  )
}

const CreateWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const jmSessionInfo = useStore(jmSessionStore, (state) => state.state)
  const { clear: clearAuthState, update: updateAuthState } = useStore(authStore, (state) => state)
  const [walletName, setWalletName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [createWalletResponse, setCreateWalletResponse] = useState<CreateWalletResponse>()
  const [step, setStep] = useState<'create' | 'seed' | 'confirm'>('create')

  // TODO: use react-hook-form and yup schema
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()

    const sanitizedWalletName = walletName.trim()
    if (!validateWalletName(sanitizedWalletName)) {
      toast.error(t('create_wallet.feedback_invalid_wallet_name'))
      return
    }

    if (password.length < 1) {
      toast.error(t('create_wallet.feedback_invalid_password'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('create_wallet.feedback_invalid_password_confirm'))
      return
    }

    try {
      setIsLoading(true)

      // Clear any existing local session
      clearAuthState()

      // Check if there's an active session on the server
      try {
        const { data: sessionInfo } = await session({ client })
        if (sessionInfo?.session === true) {
          console.warn('Active session detected:', sessionInfo)
          toast.error(
            `Cannot create wallet as "${walletDisplayName(
              (sessionInfo?.wallet_name || 'Unknown') as WalletFileName,
            )}" wallet is currently active.`,
            {
              description: (
                <>
                  Alternatively, you can{' '}
                  <a href={routes.login} className="font-medium underline hover:no-underline">
                    log in with the existing wallet
                  </a>{' '}
                  instead.
                </>
              ),
              duration: 10_000,
            },
          )
          return
        }
      } catch (sessionError) {
        console.warn('Could not check session status:', sessionError)
        // Continue anyway, wallet creation might still work
      }

      const walletFileName = walletDisplayNameToFileName(walletName)
      const { data: createData, error: createError } = await createwallet({
        client,
        body: {
          walletname: walletFileName,
          password,
          wallettype: 'sw-fb',
        },
      })

      if (createError) {
        throw createError
      }

      if (createData?.seedphrase) {
        setCreateWalletResponse(createData)
        setStep('seed')
      } else {
        throw new Error(/*TODO: i18n*/ 'No seedphrase returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSeed = async (response: CreateWalletResponse) => {
    let hashedSecret: string | undefined
    const walletFileName = response.walletname as WalletFileName

    try {
      hashedSecret = hashPassword(password, walletFileName)
    } catch (hashError) {
      console.warn('Failed to hash password, continuing without hash verification:', hashError)
    }
    updateAuthState({
      walletFileName,
      auth: { token: response.token, refresh_token: response.refresh_token }, // We'll need to unlock it properly later
      hashed_password: hashedSecret,
    })

    await navigate(routes.home)
  }

  // TODO: use react-hook-form and yup schema
  const renderCreateForm = () => (
    <form onSubmit={handleCreateWallet} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="wallet-name">{t('create_wallet.label_wallet_name')}</Label>
        <Input
          id="wallet-name"
          type="text"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          disabled={isLoading}
          placeholder={t('create_wallet.placeholder_wallet_name')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('create_wallet.label_password')}</Label>
        <div className="relative">
          <LockIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder={t('create_wallet.placeholder_password')}
            maxLength={MAX_WALLET_NAME_LENGTH}
            className="pr-10 pl-10"
            required
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="link"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 transform"
            onClick={() => {
              setShowConfirmPassword(false)
              setShowPassword((val) => !val)
            }}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t('create_wallet.label_password_confirm')}</Label>
        <div className="relative">
          <LockIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder={t('create_wallet.placeholder_password_confirm')}
            className="pr-10 pl-10"
            required
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="link"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 transform"
            onClick={() => {
              setShowPassword(false)
              setShowConfirmPassword((val) => !val)
            }}
          >
            {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin motion-reduce:hidden" />
            {t('create_wallet.button_creating')}
          </>
        ) : (
          <>{t('create_wallet.button_create')}</>
        )}
      </Button>
    </form>
  )

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <WalletIcon className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'create' && <>{t('create_wallet.title')}</>}
            {/* TODO: i18n */ step === 'seed' && 'Save Your Seed Phrase'}
          </CardTitle>
          <CardDescription>
            {/* TODO: i18n */ step === 'seed' && "This is your wallet's recovery phrase"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'seed' && (
            <>
              <PreventLeavingPageByMistake />
              <SeedPhraseContent
                seedphrase={createWalletResponse?.seedphrase?.split(' ') || []}
                onConfirm={async () => await handleConfirmSeed(createWalletResponse!)}
              />
            </>
          )}
          {step === 'create' && (
            <>
              {jmSessionInfo?.session === true ? (
                <Alert variant="warning">
                  <AlertCircleIcon />
                  <AlertDescription>
                    <p>
                      <Trans
                        i18nKey="create_wallet.alert_other_wallet_unlocked"
                        values={{
                          walletName: walletDisplayName((jmSessionInfo?.wallet_name || 'Unknown') as WalletFileName),
                        }}
                      >
                        Currently <strong>walletName</strong> is active. You need to lock it first.
                        <Link to={routes.login} className="font-semibold underline">
                          Go back
                        </Link>
                      </Trans>
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {renderCreateForm()}
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                      {/* TODO: i18n */}
                      Already have a wallet?{' '}
                      <Link to={routes.login} className="text-foreground font-semibold underline">
                        Sign in here
                      </Link>
                    </p>
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

export default CreateWalletPage
