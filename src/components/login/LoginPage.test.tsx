import type { PropsWithChildren } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/constants/routes'
import { authStore } from '@/store/authStore'
import LoginPage from './LoginPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  listWalletsRefetch: vi.fn(),
  unlockWallet: vi.fn(),
  hashPassword: vi.fn(),
  sessionState: undefined as SessionResponse | undefined,
}))

type MutationOptions = {
  mutationFn: (input: unknown) => Promise<unknown>
  onSuccess?: (result: unknown) => void
}

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  listwalletsOptions: vi.fn(() => ({ queryKey: ['wallets'], queryFn: vi.fn() })),
  unlockwalletMutation: vi.fn(() => ({
    mutationFn: mocks.unlockWallet,
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { wallets: ['cold.jmdat', 'active.jmdat'] },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: mocks.listWalletsRefetch,
  })),
  useMutation: vi.fn((options: MutationOptions) => ({
    isPending: false,
    mutateAsync: async (input: unknown) => {
      const result: unknown = await options.mutationFn(input)
      options.onSuccess?.(result)
      return result
    },
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
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSession: () => ({
    jmSession: mocks.sessionState,
    updateSessionInfo: vi.fn(),
  }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/hash', () => ({
  hashPassword: mocks.hashPassword,
}))

vi.mock('@/lib/queryClient', () => ({
  withQueryDelay: (queryFn: unknown) => queryFn,
}))

vi.mock('../layout/AuthPageShell', () => ({
  AuthPageShell: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('./LoginCard', () => ({
  LoginCard: ({
    wallets,
    activeWallet,
    makerRunning,
    coinjoinInProgress,
    onSubmit,
    onReloadClick,
  }: {
    wallets: string[]
    activeWallet?: string
    makerRunning: boolean
    coinjoinInProgress: boolean
    onSubmit: (data: { walletFileName: string; password: string }) => Promise<void>
    onReloadClick: () => Promise<void>
  }) => (
    <div>
      <div>active:{activeWallet}</div>
      <div>wallets:{wallets.join(',')}</div>
      <div>maker:{String(makerRunning)}</div>
      <div>coinjoin:{String(coinjoinInProgress)}</div>
      <button onClick={() => void onSubmit({ walletFileName: 'active.jmdat', password: 'secret' })}>submit</button>
      <button onClick={() => void onReloadClick()}>reload</button>
    </div>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.listWalletsRefetch.mockReset()
    mocks.unlockWallet.mockResolvedValue({
      walletname: 'active.jmdat',
      token: 'token',
      refresh_token: 'refresh',
    })
    mocks.hashPassword.mockResolvedValue('hashed-secret')
    authStore.getState().clear()
    mocks.sessionState = {
      session: true,
      rescanning: false,
      wallet_name: 'active.jmdat',
      maker_running: true,
      coinjoin_in_process: false,
      schedule: [['pending coinjoin']],
    }
  })

  it('passes wallet/session state to the card and unlocks the selected wallet', async () => {
    const user = userEvent.setup()

    render(<LoginPage />)

    expect(screen.getByText('active:active.jmdat')).toBeInTheDocument()
    expect(screen.getByText('maker:true')).toBeInTheDocument()
    expect(screen.getByText('coinjoin:true')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'submit' }))

    await waitFor(() =>
      expect(authStore.getState().state).toEqual({
        walletFileName: 'active.jmdat',
        auth: { token: 'token', refresh_token: 'refresh' },
        hashed_password: 'hashed-secret',
      }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith(routes.home)

    await user.click(screen.getByRole('button', { name: 'reload' }))
    expect(mocks.listWalletsRefetch).toHaveBeenCalled()
  })
})
