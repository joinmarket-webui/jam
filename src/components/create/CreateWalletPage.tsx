import { useState } from 'react'
import { type CreateWalletResponse, createwallet, session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { CircleCheckBigIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MAX_WALLET_NAME_LENGTH } from '@/constants/jam'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { walletDisplayName, walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import PreventLeavingPageByMistake from '../utils/PreventLeavingPageByMistake'
import { CreateStepConfirm } from './CreateStepConfirm'
import { CreateStepDetailsInput } from './CreateStepDetailsInput'

const validateWalletName = (input: string) =>
  input.length > 0 && input.length <= MAX_WALLET_NAME_LENGTH && /^[\w-]+$/.test(input)

type WalletFormValues = { walletName: string; password: string; confirmPassword: string }

type CreateWalletSuccessInfo = {
  values: WalletFormValues
  response: CreateWalletResponse
  hashedPassword?: string
}

const CreateWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const { clear: clearAuthState, update: updateAuthState } = useStore(authStore, (state) => state)
  const [isCreating, setIsCreating] = useState(false)
  const [createWalletSuccessInfo, setCreateWalletSuccessInfo] = useState<CreateWalletSuccessInfo>()
  const [step, setStep] = useState<'create' | 'seed' | 'confirm'>('create')

  // TODO: use react-hook-form and yup schema
  const handleCreateWallet = async ({ walletName, password, confirmPassword }: WalletFormValues) => {
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
      setIsCreating(true)

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
        hashedPassword = await hashPassword(password, createData.walletname)
      } catch (hashError) {
        console.warn('Failed to hash password, continuing without hash verification:', hashError)
      }

      setCreateWalletSuccessInfo({
        values: { walletName, password, confirmPassword },
        response: createData,
        hashedPassword,
      })
      setStep('seed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
      toast.dismiss(durationHintToastId)
    }
  }

  const handleConfirmSeed = async ({ response, hashedPassword }: CreateWalletSuccessInfo) => {
    updateAuthState({
      walletFileName: response.walletname as WalletFileName,
      auth: { token: response.token, refresh_token: response.refresh_token }, // We'll need to unlock it properly later
      hashed_password: hashedPassword,
    })

    await navigate(routes.home)
  }

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
              <CreateStepConfirm
                walletFileName={createWalletSuccessInfo!.response.walletname as WalletFileName}
                password={createWalletSuccessInfo!.values.password}
                seedphrase={createWalletSuccessInfo!.response.seedphrase?.split(/\s+/)}
                onConfirm={async () => await handleConfirmSeed(createWalletSuccessInfo!)}
              />
            </>
          )}
          {step === 'create' && (
            <CreateStepDetailsInput onSubmit={handleCreateWallet} isSubmitting={isCreating} sessionInfo={jmSession} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateWalletPage
