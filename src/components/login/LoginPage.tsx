import { listwalletsOptions, unlockwalletMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { hashPassword } from '@/lib/hash'
import { withQueryDelay } from '@/lib/queryClient'
import { sortWallets } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore, type AuthState } from '@/store/authStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { LoginCard } from './LoginCard'

interface LoginFormData {
  walletFileName: WalletFileName
  password: string
}

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateAuthState = useStore(authStore, (state) => state.update)
  const client = useApiClient()
  const jmSession = useStore(jmSessionStore, (state) => state.state)

  const makerRunning = jmSession?.maker_running === true
  const coinjoinInProgress = jmSession?.coinjoin_in_process === true || (jmSession?.schedule?.length || 0) > 0

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
      throttle: 210,
    }),
  })

  const activeWalletOrNull =
    jmSession?.wallet_name !== undefined && jmSession.wallet_name !== 'None'
      ? (jmSession?.wallet_name as WalletFileName)
      : null
  const wallets = sortWallets((listWalletsData?.wallets || []) as WalletFileName[], activeWalletOrNull)

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
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(`Failed to unlock wallet: ${reason}`)
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
      <LoginCard
        wallets={wallets}
        activeWallet={activeWalletOrNull ?? undefined}
        makerRunning={makerRunning}
        coinjoinInProgress={coinjoinInProgress}
        disabled={login.isPending || listWalletsFetching}
        onSubmit={handleSubmit}
        isSubmitting={login.isPending}
        listWalletsFetching={listWalletsFetching}
        listWalletsLoading={listWalletsLoading}
        listWalletsError={listWalletsError ?? undefined}
        onReloadClick={async () => void (await listWalletsRefetch())}
      />
    </div>
  )
}

export default LoginPage
