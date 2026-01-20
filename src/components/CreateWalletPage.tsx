import React, { useEffect, useState } from 'react'
import { type CreateWalletResponse, createwallet, session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import {
  AlertCircleIcon,
  CircleCheckBigIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockIcon,
  WalletIcon,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { walletDisplayName, JM_WALLET_FILE_EXTENSION, walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { MaskedText } from './ui/jam/MaskedText'
import { SeedPhraseGrid } from './ui/jam/SeedPhraseGrid'
import { Switch } from './ui/switch'
import PreventLeavingPageByMistake from './utils/PreventLeavingPageByMistake'

const MAX_WALLET_NAME_LENGTH = 240 - JM_WALLET_FILE_EXTENSION.length

const validateWalletName = (input: string) =>
  input.length > 0 && input.length <= MAX_WALLET_NAME_LENGTH && /^[\w-]+$/.test(input)

interface SeedPhraseContentProps {
  walletFileName: WalletFileName
  password: string
  seedphrase: string[]
  onConfirm: () => Promise<void>
}

const SeedPhraseContent = ({ walletFileName, password, seedphrase, onConfirm }: SeedPhraseContentProps) => {
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState({ checked: false, dirty: false })
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (backupConfirmed) return

    const toastId = toast.message(
      <Alert>
        <AlertCircleIcon />
        <AlertTitle>
          {/* TODO: i18n */}
          Save Your Seed Phrase
        </AlertTitle>
        <AlertDescription>
          {/* TODO: change i18n key ("alert_description") */}
          {t('create_wallet.subtitle_wallet_created')}
        </AlertDescription>
      </Alert>,
      {
        duration: Infinity,
        unstyled: true,
      },
    )

    return () => {
      toast.dismiss(toastId)
    }
  }, [backupConfirmed])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_wallet_name')}</Label>
          <span className="text-sm font-semibold break-all select-all">{walletFileName}</span>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_password')}</Label>
          <MaskedText
            className="font-mono text-sm font-semibold break-all slashed-zero select-none"
            masked={!revealSensitiveInfo.checked}
            maskedText="maskedmaskedmaskedmasked"
          >
            {password}
          </MaskedText>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{/* i18n confirmation_label_seedphrase */}Seed Phrase</Label>
          <div className="bg-muted rounded-lg py-2">
            <SeedPhraseGrid value={seedphrase} masked={!revealSensitiveInfo.checked} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-start gap-2">
          <Switch
            id="switch-reveal-seed"
            checked={revealSensitiveInfo.checked}
            onCheckedChange={(checked) => setRevealSensitiveInfo((it) => ({ ...it, checked, dirty: true }))}
          />
          <Label htmlFor="switch-reveal-seed">{t('create_wallet.confirmation_toggle_reveal_info')}</Label>
        </div>

        <div className="flex justify-start gap-2">
          <Switch
            id="switch-confirm-backup"
            checked={backupConfirmed}
            onCheckedChange={(checked) => setBackupConfirmed(checked)}
            disabled={!revealSensitiveInfo.dirty}
          />
          <Label htmlFor="switch-confirm-backup">{t('create_wallet.confirmation_toggle_info_written_down')}</Label>
        </div>
      </div>

      <Button
        onClick={async () => await onConfirm()}
        className="w-full"
        size="lg"
        disabled={!backupConfirmed || !revealSensitiveInfo.dirty}
      >
        {t('create_wallet.next_button')}
      </Button>
    </div>
  )
}

type CreateWalletResponseWithHashedPassword = {
  response: CreateWalletResponse
  hashedPassword?: string
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
  const [createWalletResponse, setCreateWalletResponse] = useState<CreateWalletResponseWithHashedPassword>()
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

    const durationHintToastId = toast.loading(t('create_wallet.hint_duration_text'), {
      id: 'alert-wallet-create-creating-duration-hint',
      duration: Infinity,
      position: 'top-center',
    })
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

      let hashedPassword: string | undefined = undefined
      try {
        hashedPassword = await hashPassword(password, createData?.walletname)
      } catch (hashError) {
        console.warn('Failed to hash password, continuing without hash verification:', hashError)
      }

      if (createData?.seedphrase) {
        setCreateWalletResponse({
          response: createData,
          hashedPassword,
        })
        setStep('seed')
      } else {
        throw new Error(/*TODO: i18n*/ 'No seedphrase returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      toast.dismiss(durationHintToastId)
    }
  }

  const handleConfirmSeed = async ({ response, hashedPassword }: CreateWalletResponseWithHashedPassword) => {
    updateAuthState({
      walletFileName: response.walletname as WalletFileName,
      auth: { token: response.token, refresh_token: response.refresh_token }, // We'll need to unlock it properly later
      hashed_password: hashedPassword,
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
            <Loader2Icon className="animate-spin motion-reduce:hidden" />
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
            {step === 'create' && <WalletIcon className="text-primary" />}
            {step === 'seed' && <CircleCheckBigIcon className="text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'create' && t('create_wallet.title')}
            {step === 'seed' && t('create_wallet.title_wallet_created')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'seed' && (
            <>
              <PreventLeavingPageByMistake />
              <SeedPhraseContent
                walletFileName={(createWalletResponse?.response.walletname ?? '<empty>') as WalletFileName}
                password={password}
                seedphrase={createWalletResponse?.response.seedphrase?.split(/\s+/) ?? []}
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
                <>{renderCreateForm()}</>
              )}
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  {/* TODO: i18n */}
                  Already have a wallet?{' '}
                  <Button variant="link" asChild>
                    <Link to={routes.login} className="font-semibold">
                      Sign in here
                    </Link>
                  </Button>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateWalletPage
