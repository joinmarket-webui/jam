import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  configgetMutation,
  configsettingMutation,
  listwalletsOptions,
  recoverwalletMutation,
  unlockwalletMutation,
} from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { lockwallet, rescanblockchain, session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CircleCheckBigIcon, KeyRoundIcon, WalletIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JM_DEFAULT_WALLET_TYPE, JM_GAPLIMIT_CONFIGKEY, JM_GAPLIMIT_DEFAULT } from '@/constants/jm'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { buildAuthHeaderMap, type ApiToken } from '@/lib/config'
import { getErrorReason } from '@/lib/errorReason'
import { hashPassword } from '@/lib/hash'
import { walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore, type AuthState } from '@/store/authStore'
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

  const { state: jmSession, update: updateSessionInfo } = useStore(jmSessionStore, (state) => state)
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
  const fetchConfig = useMutation({
    ...configgetMutation({
      client,
      throwOnError: true,
    }),
    retry: false,
  })
  const updateConfig = useMutation({
    ...configsettingMutation({
      client,
      throwOnError: true,
    }),
    retry: false,
  })

  const lockWallet = useMutation({
    mutationFn: async (parameters: { walletFileName: WalletFileName; token: ApiToken }) => {
      const { data } = await lockwallet({
        client,
        path: { walletname: encodeURIComponent(parameters.walletFileName) },
        headers: { ...buildAuthHeaderMap(parameters.token) },
        throwOnError: true,
      })
      return data
    },
    retry: false,
  })
  const unlockWallet = useMutation({
    ...unlockwalletMutation({
      client,
      throwOnError: true,
    }),
    retry: false,
  })

  const rescanMutation = useMutation({
    mutationFn: async (parameters: { walletFileName: WalletFileName; token: ApiToken; blockHeight: number }) => {
      const { data } = await rescanblockchain({
        client,
        path: {
          walletname: encodeURIComponent(parameters.walletFileName),
          blockheight: parameters.blockHeight,
        },
        headers: { ...buildAuthHeaderMap(parameters.token) },
        throwOnError: true,
      })
      return data
    },
    retry: false,
  })

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

    const walletFileName = walletDisplayNameToFileName(walletDetails.walletName)

    let authState: (Required<Omit<AuthState, 'hashed_password'>> & Pick<AuthState, 'hashed_password'>) | undefined =
      undefined
    try {
      // Step #1: recover wallet
      const recoverWalletResponse = await recoverWallet.mutateAsync({
        body: {
          walletname: walletFileName,
          password: walletDetails.password,
          wallettype: JM_DEFAULT_WALLET_TYPE,
          seedphrase: importDetails.mnemonicPhrase,
        },
      })

      authState = {
        walletFileName: recoverWalletResponse.walletname as WalletFileName,
        auth: {
          token: recoverWalletResponse.token,
          refresh_token: recoverWalletResponse.refresh_token,
        },
      }

      try {
        authState.hashed_password = await hashPassword(
          walletDetails.password,
          recoverWalletResponse.walletname as WalletFileName,
        )
      } catch (hashError) {
        console.warn('Failed to hash password after wallet recovery:', hashError)
      }
      // Step #2: update the gaplimit config value if necessary
      const originalGaplimitResponse = await fetchConfig.mutateAsync({
        path: { walletname: encodeURIComponent(authState.walletFileName) },
        headers: { ...buildAuthHeaderMap(authState.auth.token) },
        body: JM_GAPLIMIT_CONFIGKEY,
      })
      const originalGaplimit = Number.parseInt(originalGaplimitResponse.configvalue, 10) || JM_GAPLIMIT_DEFAULT

      const gaplimitUpdateNecessary = importDetails.gaplimit !== originalGaplimit
      if (gaplimitUpdateNecessary) {
        console.info('Will update gaplimit from %d to %d', originalGaplimit, importDetails.gaplimit)

        await updateConfig.mutateAsync({
          path: { walletname: encodeURIComponent(authState.walletFileName) },
          headers: { ...buildAuthHeaderMap(authState.auth.token) },
          body: {
            ...JM_GAPLIMIT_CONFIGKEY,
            value: String(importDetails.gaplimit),
          },
        })
      }
      // Step #3: lock and unlock the wallet (for new addresses to be imported)
      await lockWallet.mutateAsync({
        walletFileName: authState.walletFileName,
        token: authState.auth.token,
      })

      const unlockResponse = await unlockWallet.mutateAsync({
        path: { walletname: encodeURIComponent(authState.walletFileName) },
        headers: { ...buildAuthHeaderMap(authState.auth.token) },
        body: {
          password: walletDetails.password,
        },
      })

      // use new token in requests
      authState.walletFileName = unlockResponse.walletname as WalletFileName
      authState.auth = {
        token: unlockResponse.token,
        refresh_token: unlockResponse.refresh_token,
      }

      // Step #4: reset `gaplimit´ to previous value if necessary
      if (gaplimitUpdateNecessary) {
        console.info('Will reset gaplimit to previous value %d', originalGaplimit)
        await updateConfig.mutateAsync({
          path: { walletname: encodeURIComponent(authState.walletFileName) },
          headers: { ...buildAuthHeaderMap(authState.auth.token) },
          body: {
            ...JM_GAPLIMIT_CONFIGKEY,
            value: String(originalGaplimit),
          },
        })
      }

      // Step #5: invoke rescanning the timechain
      console.info('Will start rescanning timechain from block %d', importDetails.blockheight)
      await rescanMutation.mutateAsync({
        walletFileName: authState.walletFileName,
        token: authState.auth.token,
        blockHeight: importDetails.blockheight,
      })

      try {
        const { data: sessionInfo } = await session({ client, throwOnError: true })
        updateSessionInfo({
          ...sessionInfo,
          rescanning: true,
        })
        toast.success(t('rescan_chain.success_rescan_started'))
      } catch (_ignoredOnPurpose: unknown) {
        // empty on purpose: it does not matter if session request fails
      }

      updateAuthState(authState)

      toast.success(t('import_wallet.success.title'))
      await navigate(routes.home)
    } catch (error: unknown) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('import_wallet.error_importing_failed', { reason }))

      if (authState?.auth.token !== undefined) {
        try {
          // try to lock the current wallet on error on a best effort basis
          await lockWallet.mutateAsync({
            walletFileName: authState.walletFileName,
            token: authState.auth.token,
          })
        } catch (_ignoredOnPurpose: unknown) {
          // empty on purpose
        }
      }
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
                  value={{
                    walletDetails: stepWalletDetailsValues!,
                    importDetails: stepImportDetailsValues!,
                  }}
                  onConfirm={handleConfirm}
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
