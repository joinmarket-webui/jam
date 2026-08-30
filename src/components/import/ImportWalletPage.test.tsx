import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/constants/routes'
import { authStore } from '@/store/authStore'
import ImportWalletPage from './ImportWalletPage'

type SessionInfoUpdater = (previousState?: SessionResponse) => SessionResponse | undefined

const mocks = vi.hoisted(() => ({
  configGet: vi.fn(),
  configSet: vi.fn(),
  lockWallet: vi.fn(),
  recoverWallet: vi.fn(),
  rescanBlockchain: vi.fn(),
  session: vi.fn(),
  unlockWallet: vi.fn(),
  hashPassword: vi.fn(),
  navigate: vi.fn(),
  toastDismiss: vi.fn(),
  toastLoading: vi.fn(() => 'toast-id'),
  toastSuccess: vi.fn(),
  sessionState: undefined as SessionResponse | undefined,
  updateSessionInfo: vi.fn((updater: unknown) => {
    if (typeof updater === 'function') {
      mocks.sessionState = (updater as SessionInfoUpdater)(mocks.sessionState)
    } else {
      mocks.sessionState = updater as SessionResponse | undefined
    }
  }),
}))

type MutationOptions = { mutationFn: (input: unknown) => Promise<unknown> }

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  configgetMutation: vi.fn(() => ({ mutationFn: mocks.configGet })),
  configsettingMutation: vi.fn(() => ({ mutationFn: mocks.configSet })),
  listwalletsOptions: vi.fn(() => ({ queryKey: ['wallets'], queryFn: vi.fn() })),
  recoverwalletMutation: vi.fn(() => ({ mutationFn: mocks.recoverWallet })),
  unlockwalletMutation: vi.fn(() => ({ mutationFn: mocks.unlockWallet })),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/jm', () => ({
  lockwallet: mocks.lockWallet,
  rescanblockchain: mocks.rescanBlockchain,
  session: mocks.session,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { wallets: ['existing.jmdat'] },
  })),
  useMutation: vi.fn((options: MutationOptions) => ({
    isPending: false,
    mutateAsync: async (input: unknown) => await options.mutationFn(input),
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('sonner', () => ({
  toast: {
    dismiss: mocks.toastDismiss,
    error: vi.fn(),
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({
    jmSession: mocks.sessionState,
    updateSessionInfo: mocks.updateSessionInfo,
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/config', () => ({
  buildAuthHeaderMap: (token: string) => ({ 'x-jm-authorization': `Bearer ${token}` }),
}))

vi.mock('@/lib/hash', () => ({
  hashPassword: mocks.hashPassword,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(' '),
  parseSemanticVersion: (raw?: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+).*$/u.exec(raw ?? '')
    return match
      ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw }
      : { major: 0, minor: 0, patch: 0, raw: 'unknown' }
  },
  percentageToFactor: (value: number) => value / 100,
  walletDisplayNameToFileName: (walletName: string) => `${walletName}.jmdat`,
}))

vi.mock('../layout/AuthPageShell', () => ({
  AuthPageShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('../utils/PreventLeavingPageByMistake', () => ({
  default: () => <div>prevent-leaving</div>,
}))

vi.mock('./ImportStepWalletDetails', () => ({
  ImportStepWalletDetails: ({
    onSubmit,
  }: {
    onSubmit: (values: { walletName: string; password: string; confirmPassword: string }) => void
  }) => (
    <button onClick={() => onSubmit({ walletName: 'restored', password: 'secret', confirmPassword: 'secret' })}>
      wallet details
    </button>
  ),
}))

vi.mock('./ImportStepImportDetails', () => ({
  ImportStepImportDetails: ({
    onSubmit,
    onBack,
  }: {
    onSubmit: (values: { mnemonicPhrase: string; gaplimit: number; blockheight: number }) => void
    onBack: () => void
  }) => (
    <>
      <button
        onClick={() =>
          onSubmit({
            mnemonicPhrase: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
            gaplimit: 12,
            blockheight: 123,
          })
        }
      >
        import details
      </button>
      <button onClick={onBack}>back</button>
    </>
  ),
}))

vi.mock('./ImportStepConfirm', () => ({
  ImportStepConfirm: ({
    value,
    onConfirm,
    onBack,
  }: {
    value: unknown
    onConfirm: (value: unknown) => Promise<void>
    onBack: () => void
  }) => (
    <>
      <button onClick={() => void onConfirm(value)}>confirm import</button>
      <button onClick={onBack}>confirm back</button>
    </>
  ),
}))

describe('ImportWalletPage', () => {
  beforeEach(() => {
    mocks.configGet.mockReset()
    mocks.configSet.mockReset()
    mocks.lockWallet.mockReset()
    mocks.recoverWallet.mockReset()
    mocks.rescanBlockchain.mockReset()
    mocks.session.mockReset()
    mocks.unlockWallet.mockReset()
    mocks.hashPassword.mockReset()
    mocks.navigate.mockReset()
    mocks.toastDismiss.mockReset()
    mocks.toastLoading.mockClear()
    mocks.toastSuccess.mockReset()
    authStore.getState().clear()
    mocks.sessionState = undefined

    mocks.recoverWallet.mockResolvedValue({
      walletname: 'restored.jmdat',
      token: 'recover-token',
      refresh_token: 'recover-refresh',
    })
    mocks.configGet.mockResolvedValue({ configvalue: '6' })
    mocks.configSet.mockResolvedValue({})
    mocks.lockWallet.mockResolvedValue({ data: {} })
    mocks.unlockWallet.mockResolvedValue({
      walletname: 'restored.jmdat',
      token: 'unlock-token',
      refresh_token: 'unlock-refresh',
    })
    mocks.rescanBlockchain.mockResolvedValue({ data: {} })
    mocks.session.mockResolvedValue({ data: { wallet_name: 'restored.jmdat', session: true } })
    mocks.hashPassword.mockResolvedValue('hashed-secret')
  })

  it('imports a wallet, restores gaplimit, starts rescan, and signs in', async () => {
    const user = userEvent.setup()

    render(<ImportWalletPage />)

    await user.click(screen.getByRole('button', { name: 'wallet details' }))
    await user.click(screen.getByRole('button', { name: 'import details' }))
    await user.click(screen.getByRole('button', { name: 'confirm import' }))

    await waitFor(() =>
      expect(authStore.getState().state).toEqual({
        walletFileName: 'restored.jmdat',
        auth: { token: 'unlock-token', refresh_token: 'unlock-refresh' },
        hashed_password: 'hashed-secret',
      }),
    )
    expect(mocks.configSet).toHaveBeenCalledTimes(2)
    expect(mocks.rescanBlockchain).toHaveBeenCalled()
    expect(mocks.sessionState?.rescanning).toBe(true)
    expect(mocks.navigate).toHaveBeenCalledWith(routes.home)
    expect(mocks.toastDismiss).toHaveBeenCalledWith('toast-id')
  })
})
