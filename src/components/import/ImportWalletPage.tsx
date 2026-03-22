import type { ComponentProps } from 'react'
import { useState } from 'react'
import { listwalletsOptions, recoverwalletMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CircleCheckBigIcon, KeyRoundIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JM_DEFAULT_WALLET_TYPE } from '@/constants/jm'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { hashPassword } from '@/lib/hash'
import { walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import type { CreateWalletForm } from '../create/CreateWalletForm'
import { AuthPageShell } from '../layout/AuthPageShell'
import PreventLeavingPageByMistake from '../utils/PreventLeavingPageByMistake'
import type { ImportDetailsForm } from './ImportDetailsForm'
import { ImportStepConfirm } from './ImportStepConfirm'
import { ImportStepImportDetails } from './ImportStepImportDetails'
import { ImportStepWalletDetails } from './ImportStepWalletDetails'

type WalletDetailsValues = Parameters<ComponentProps<typeof CreateWalletForm>['onSubmit']>[0]
type ImportDetailsValues = Parameters<ComponentProps<typeof ImportDetailsForm>['onSubmit']>[0]

type ImportFlowStep = 'wallet_details' | 'import_details' | 'confirm'

const ImportWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)
  const { update: updateAuthState } = useStore(authStore, (state) => state)
  const [step, setStep] = useState<ImportFlowStep>('wallet_details')
  const [stepWalletDetailsValues, setStepWalletDetailsValues] = useState<WalletDetailsValues>()
  const [stepImportDetailsValues, setStepImportDetailsValues] = useState<ImportDetailsValues>()

  const listWalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
  })

  const onSubmitWalletDetails = (values: WalletDetailsValues) => {
    setStepWalletDetailsValues(values)
    setStep('import_details')
  }

  const onSubmitImportDetails = (values: ImportDetailsValues) => {
    setStepImportDetailsValues(values)
    setStep('confirm')
  }

  const onBackImportDetails = () => {
    setStepImportDetailsValues(undefined)
    setStep('wallet_details')
  }

  const recoverWallet = useMutation({
    ...recoverwalletMutation({ client, throwOnError: true }),
    retry: false,
  })

  // TODO update gaplimit like https://github.com/joinmarket-webui/jam/blob/devel/src/components/ImportWallet.tsx#L459
  const handleConfirm = async ({
    walletDetails,
    importDetails,
  }: {
    walletDetails: WalletDetailsValues
    importDetails: ImportDetailsValues
  }) => {
    const durationHintToastId = toast.loading(t('create_wallet.hint_duration_text'), {
      id: 'alert-wallet-create-creating-duration-hint',
      duration: Number.POSITIVE_INFINITY,
      position: 'top-center',
    })
    try {
      const walletFileName = walletDisplayNameToFileName(walletDetails.walletName)
      const response = await recoverWallet.mutateAsync({
        body: {
          walletname: walletFileName,
          password: walletDetails.password,
          wallettype: JM_DEFAULT_WALLET_TYPE,
          seedphrase: importDetails.seedPhrase,
        },
      })

      let hashedPassword: string | undefined
      try {
        hashedPassword = await hashPassword(walletDetails.password, response.walletname as WalletFileName)
      } catch (hashError) {
        console.warn('Failed to hash password after wallet recovery:', hashError)
      }

      updateAuthState({
        walletFileName: response.walletname as WalletFileName,
        auth: { token: response.token, refresh_token: response.refresh_token },
        hashed_password: hashedPassword,
      })

      toast.success(t('import_wallet.success.title'))
      await navigate(routes.home)
    } catch (error: unknown) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('import_wallet.error_importing_failed', { reason }))
      throw error
    } finally {
      toast.dismiss(durationHintToastId)
    }
  }

  return (
    <AuthPageShell>
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            {step === 'wallet_details' && <WalletIcon className="text-primary" />}
            {step === 'import_details' && <KeyRoundIcon className="text-primary" />}
            {step === 'confirm' && <CircleCheckBigIcon className="text-primary" />}
          </div>
          <CardTitle className="text-xl font-bold">
            {step === 'wallet_details' && t('import_wallet.wallet_details.title')}
            {step === 'import_details' && t('import_wallet.import_details.title')}
            {step === 'confirm' && t('import_wallet.confirmation.title')}
          </CardTitle>
          {step === 'import_details' && <CardDescription>{t('import_wallet.import_details.subtitle')}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'wallet_details' && (
            <ImportStepWalletDetails
              wallets={(listWalletsQuery.data?.wallets ?? []) as WalletFileName[]}
              initialValues={stepWalletDetailsValues}
              onSubmit={onSubmitWalletDetails}
              sessionInfo={jmSession}
              submitButtonText={({ isSubmitting }) =>
                isSubmitting
                  ? t('import_wallet.wallet_details.text_button_submitting')
                  : t('import_wallet.wallet_details.text_button_submit')
              }
            />
          )}
          {step === 'import_details' && (
            <ImportStepImportDetails
              initialValues={stepImportDetailsValues}
              onSubmit={onSubmitImportDetails}
              sessionInfo={jmSession}
              onBack={onBackImportDetails}
            />
          )}
          {step === 'confirm' && (
            <>
              <PreventLeavingPageByMistake />
              {
                <ImportStepConfirm
                  walletFileName={walletDisplayNameToFileName(stepWalletDetailsValues!.walletName)}
                  password={stepWalletDetailsValues!.password}
                  seedphrase={stepImportDetailsValues!.seedPhrase?.split(/\s+/)}
                  onConfirm={async () =>
                    await handleConfirm({
                      walletDetails: stepWalletDetailsValues!,
                      importDetails: stepImportDetailsValues!,
                    })
                  }
                  onBack={() => setStep('import_details')}
                />
              }
            </>
          )}
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export default ImportWalletPage
