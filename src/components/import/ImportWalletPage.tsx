import type { ComponentProps, PropsWithChildren } from 'react'
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
import { CircleCheckBigIcon, KeyRoundIcon, WalletIcon, type LucideIcon } from 'lucide-react'
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

const ImportWalletCard = ({
  icon: Icon,
  title,
  description,
  children,
}: PropsWithChildren<{ icon: LucideIcon; title: string; description?: string }>) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center space-y-2">
        <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        {description !== undefined && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

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

    let authState: (Required<Omit<AuthState, 'hashed_password'>> & Pick<AuthState, 'hashed_password'>) | undefined =
      undefined
    try {
      // Step #1: recover wallet
      const recoverWalletResponse = await recoverWallet.mutateAsync({
        body: {
          walletname: walletDisplayNameToFileName(walletDetails.walletName),
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
      } catch (hashError: unknown) {
        console.warn('Failed to hash password after wallet import', hashError)
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
      } catch (error: unknown) {
        const reason = getErrorReason(error, 'Unknown error.')
        console.warn('Non-critical error while fetching session after wallet import. Continuing with import...', reason)
      }

      updateAuthState(authState)

      toast.success(t('import_wallet.success.title'))
      await navigate(routes.home)
    } catch (error: unknown) {
      console.error('Error while importing wallet', error)

      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      const errorMessage = t('import_wallet.error_importing_failed', { reason })
      toast.error(errorMessage)

      if (authState?.auth.token !== undefined) {
        try {
          // try to lock the current wallet on error on a best effort basis
          await lockWallet.mutateAsync({
            walletFileName: authState.walletFileName,
            token: authState.auth.token,
          })
        } catch (error: unknown) {
          const reason = getErrorReason(error, 'Unknown error.')
          console.warn('Locking wallet attempt failed after import error.', reason)
        }
      }
    } finally {
      toast.dismiss(durationHintToastId)
    }
  }

  return (
    <AuthPageShell>
      {step === 'wallet_details' && (
        <ImportWalletCard icon={WalletIcon} title={t('import_wallet.wallet_details.title')}>
          <ImportStepWalletDetails
            sessionInfo={jmSession}
            wallets={(listWalletsQuery.data?.wallets ?? []) as WalletFileName[]}
            initialValues={stepWalletDetailsValues}
            onSubmit={onSubmitWalletDetails}
            submitButtonText={({ isSubmitting }) =>
              isSubmitting
                ? t('import_wallet.wallet_details.text_button_submitting')
                : t('import_wallet.wallet_details.text_button_submit')
            }
          />
        </ImportWalletCard>
      )}
      {step === 'import_details' && (
        <ImportWalletCard
          icon={KeyRoundIcon}
          title={t('import_wallet.import_details.title')}
          description={t('import_wallet.import_details.subtitle')}
        >
          <ImportStepImportDetails
            sessionInfo={jmSession}
            initialValues={stepImportDetailsValues}
            onSubmit={onSubmitImportDetails}
            onBack={onBackImportDetails}
          />
        </ImportWalletCard>
      )}
      {step === 'confirm' && (
        <>
          <PreventLeavingPageByMistake />
          <ImportWalletCard icon={CircleCheckBigIcon} title={t('import_wallet.confirmation.title')}>
            <ImportStepConfirm
              value={{
                walletDetails: stepWalletDetailsValues!,
                importDetails: stepImportDetailsValues!,
              }}
              onConfirm={handleConfirm}
              onBack={() => setStep('import_details')}
            />
          </ImportWalletCard>
        </>
      )}
    </AuthPageShell>
  )
}

export default ImportWalletPage
