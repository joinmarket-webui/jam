import type { ComponentProps, PropsWithChildren } from 'react'
import { useState } from 'react'
import { listwalletsOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { type CreateWalletResponse, createwallet, session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useQuery } from '@tanstack/react-query'
import { CircleCheckBigIcon, ShieldCheckIcon, WalletIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JM_DEFAULT_WALLET_TYPE } from '@/constants/jm'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { hashPassword } from '@/lib/hash'
import { walletDisplayName, walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { AuthPageShell } from '../layout/AuthPageShell'
import PreventLeavingPageByMistake from '../utils/PreventLeavingPageByMistake'
import { CreateStepConfirm } from './CreateStepConfirm'
import { CreateStepVerifyMnemonic } from './CreateStepVerifyMnemonic'
import { CreateStepWalletDetails } from './CreateStepWalletDetails'
import { CreateWalletForm } from './CreateWalletForm'

type WalletDetailsValues = Parameters<ComponentProps<typeof CreateWalletForm>['onSubmit']>[0]

const CreateWalletCard = ({ icon: Icon, title, children }: PropsWithChildren<{ icon: LucideIcon; title: string }>) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center space-y-2">
        <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

type CreateWalletSuccessInfo = {
  values: WalletDetailsValues
  response: CreateWalletResponse
  hashedPassword?: string
}

const CreateWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const { clear: clearAuthState, update: updateAuthState } = useStore(authStore, (state) => state)
  const [createWalletSuccessInfo, setCreateWalletSuccessInfo] = useState<CreateWalletSuccessInfo>()
  const [step, setStep] = useState<'wallet_details' | 'confirm' | 'verify_mnemonic'>('wallet_details')

  const listWalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
  })

  const handleCreateWallet = async ({ walletName, password, confirmPassword }: WalletDetailsValues) => {
    const durationHintToastId = toast.loading(t('create_wallet.hint_duration_text'), {
      id: 'alert-wallet-create-creating-duration-hint',
      duration: Number.POSITIVE_INFINITY,
      position: 'top-center',
    })
    try {
      // Clear any existing local session
      clearAuthState()

      // Check if there's an active session on the server
      try {
        const { data: sessionInfo } = await session({ client })
        if (sessionInfo?.session === true) {
          console.warn('Active session detected:', sessionInfo)
          // TODO: i18n
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
      const { data: createData } = await createwallet({
        client,
        body: {
          walletname: walletFileName,
          password,
          wallettype: JM_DEFAULT_WALLET_TYPE,
        },
        throwOnError: true,
      })

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

      setStep('confirm')
    } catch (error: unknown) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      /* TODO: i18n */
      toast.error(`Failed to create wallet: ${reason}`)
    } finally {
      toast.dismiss(durationHintToastId)
    }
  }

  const handleConfirmMnemonic = () => {
    setStep('verify_mnemonic')
    return Promise.resolve()
  }

  const handleMnemonicVerified = async ({ response, hashedPassword }: CreateWalletSuccessInfo) => {
    updateAuthState({
      walletFileName: response.walletname as WalletFileName,
      auth: { token: response.token, refresh_token: response.refresh_token },
      hashed_password: hashedPassword,
    })

    await navigate(routes.home)
  }

  return (
    <AuthPageShell>
      {step === 'wallet_details' && (
        <CreateWalletCard icon={WalletIcon} title={t('create_wallet.title')}>
          <CreateStepWalletDetails
            wallets={(listWalletsQuery.data?.wallets ?? []) as WalletFileName[]}
            onSubmit={handleCreateWallet}
            sessionInfo={jmSession}
            submitButtonText={({ isSubmitting }) =>
              isSubmitting ? t('create_wallet.button_creating') : t('create_wallet.button_create')
            }
          />
        </CreateWalletCard>
      )}
      {step === 'confirm' && (
        <CreateWalletCard icon={CircleCheckBigIcon} title={t('create_wallet.title_wallet_created')}>
          <PreventLeavingPageByMistake />
          <CreateStepConfirm
            walletFileName={createWalletSuccessInfo!.response.walletname as WalletFileName}
            password={createWalletSuccessInfo!.values.password}
            mnemonicPhrase={createWalletSuccessInfo!.response.seedphrase?.split(/\s+/)}
            onConfirm={handleConfirmMnemonic}
          />
        </CreateWalletCard>
      )}
      {step === 'verify_mnemonic' && (
        <CreateWalletCard icon={ShieldCheckIcon} title={t('create_wallet.verify_mnemonic.title')}>
          <PreventLeavingPageByMistake />
          <CreateStepVerifyMnemonic
            mnemonicPhrase={createWalletSuccessInfo!.response.seedphrase?.split(/\s+/) ?? []}
            onVerified={async () => await handleMnemonicVerified(createWalletSuccessInfo!)}
            onBack={() => setStep('confirm')}
          />
        </CreateWalletCard>
      )}
    </AuthPageShell>
  )
}

export default CreateWalletPage
