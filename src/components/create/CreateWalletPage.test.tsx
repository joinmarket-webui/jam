import type { PropsWithChildren } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/constants/routes'
import { authStore } from '@/store/authStore'
import CreateWalletPage from './CreateWalletPage'

const mocks = vi.hoisted(() => ({
  createWallet: vi.fn(),
  unlockWallet: vi.fn(),
  lockWallet: vi.fn(),
  hashPassword: vi.fn(),
  navigate: vi.fn(),
  sessionRefetch: vi.fn(),
  toastDismiss: vi.fn(),
  toastLoading: vi.fn(() => 'toast-id'),
}))

type QueryOptions = { queryKey?: readonly unknown[] }
type MutationOptions = { mutationFn: (input: unknown) => Promise<unknown> }

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  createwalletMutation: vi.fn(() => ({ mutationFn: mocks.createWallet })),
  listwalletsOptions: vi.fn(() => ({ queryKey: ['wallets'], queryFn: vi.fn() })),
  sessionOptions: vi.fn(() => ({ queryKey: ['session'], queryFn: vi.fn() })),
  unlockwalletMutation: vi.fn(() => ({ mutationFn: mocks.unlockWallet })),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => ({
  lockwallet: mocks.lockWallet,
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((options: QueryOptions) =>
    options.queryKey?.[0] === 'session'
      ? {
          data: undefined,
          refetch: mocks.sessionRefetch,
        }
      : {
          data: { wallets: ['existing.jmdat'] },
        },
  ),
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
  },
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({
    jmSession: undefined,
    updateSessionInfo: vi.fn(),
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
  delayedPromise: vi.fn(() => Promise.resolve()),
  parseSemanticVersion: (raw?: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+).*$/u.exec(raw ?? '')
    return match
      ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw }
      : { major: 0, minor: 0, patch: 0, raw: 'unknown' }
  },
  percentageToFactor: (value: number) => value / 100,
  walletDisplayName: (walletFileName: string) => walletFileName.replace(/\.jmdat$/, ''),
  walletDisplayNameToFileName: (walletName: string) => `${walletName}.jmdat`,
}))

vi.mock('../layout/AuthPageShell', () => ({
  AuthPageShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('../utils/PreventLeavingPageByMistake', () => ({
  default: () => <div>prevent-leaving</div>,
}))

vi.mock('./CreateStepWalletDetails', () => ({
  CreateStepWalletDetails: ({
    onSubmit,
  }: {
    onSubmit: (values: { walletName: string; password: string; confirmPassword: string }) => Promise<void>
  }) => (
    <button onClick={() => void onSubmit({ walletName: 'fresh', password: 'secret', confirmPassword: 'secret' })}>
      create wallet
    </button>
  ),
}))

vi.mock('./CreateStepConfirm', () => ({
  CreateStepConfirm: ({ walletFileName, onConfirm }: { walletFileName: string; onConfirm: () => Promise<void> }) => (
    <button onClick={() => void onConfirm()}>confirm {walletFileName}</button>
  ),
}))

vi.mock('./CreateStepVerifyMnemonic', () => ({
  CreateStepVerifyMnemonic: ({ onVerified }: { onVerified: () => Promise<void> }) => (
    <button onClick={() => void onVerified()}>verify mnemonic</button>
  ),
}))

describe('CreateWalletPage', () => {
  beforeEach(() => {
    mocks.createWallet.mockReset()
    mocks.unlockWallet.mockReset()
    mocks.lockWallet.mockReset()
    mocks.hashPassword.mockReset()
    mocks.navigate.mockReset()
    mocks.sessionRefetch.mockResolvedValue({ data: { session: false } })
    mocks.toastDismiss.mockReset()
    mocks.toastLoading.mockClear()
    authStore.getState().clear()

    mocks.createWallet.mockResolvedValue({
      walletname: 'fresh.jmdat',
      token: 'create-token',
      seedphrase: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
    })
    mocks.lockWallet.mockResolvedValue({ data: {} })
    mocks.unlockWallet.mockResolvedValue({
      walletname: 'fresh.jmdat',
      token: 'unlock-token',
      refresh_token: 'refresh-token',
    })
    mocks.hashPassword.mockResolvedValue('hashed-secret')
  })

  it('creates, confirms, and unlocks a new wallet', async () => {
    const user = userEvent.setup()

    render(<CreateWalletPage />)

    await user.click(screen.getByRole('button', { name: 'create wallet' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'confirm fresh.jmdat' })).toBeInTheDocument())
    expect(mocks.lockWallet).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'confirm fresh.jmdat' }))
    await user.click(screen.getByRole('button', { name: 'verify mnemonic' }))

    await waitFor(() =>
      expect(authStore.getState().state).toEqual({
        walletFileName: 'fresh.jmdat',
        auth: { token: 'unlock-token', refresh_token: 'refresh-token' },
        hashed_password: 'hashed-secret',
      }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith(routes.home)
    expect(mocks.toastDismiss).toHaveBeenCalledWith('toast-id')
  })
})
