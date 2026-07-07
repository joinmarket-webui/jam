import type { ComponentProps, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppNavbar } from './AppNavbar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={String(to)}>{children}</a>,
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <span data-testid="balance">{valueString}</span>,
}))

const LOCK_WALLET_LABEL = 'settings.button_lock_wallet'
const LOGOUT_LABEL = 'Logout'

const defaults: ComponentProps<typeof AppNavbar> = {
  theme: 'dark',
  toggleTheme: vi.fn(),
  onLogout: vi.fn().mockResolvedValue(undefined),
  onLockWallet: vi.fn().mockResolvedValue(undefined),
  walletName: 'Satoshi',
  totalBalance: 21_000_000,
}

const queryLockWalletButton = () => screen.queryByRole('button', { name: LOCK_WALLET_LABEL })
const queryLogoutButton = () => screen.queryByRole('button', { name: LOGOUT_LABEL })

describe('AppNavbar lock/logout toggle', () => {
  it('shows "lock wallet" and hides "logout" when idle', () => {
    render(<AppNavbar {...defaults} />)

    expect(queryLockWalletButton()).toBeInTheDocument()
    expect(queryLogoutButton()).not.toBeInTheDocument()
  })

  it('shows "logout" and hides "lock wallet" while the maker is running', () => {
    render(
      <AppNavbar
        {...defaults}
        sessionInfo={{ maker_running: true, coinjoin_in_process: false, schedule: undefined }}
      />,
    )

    expect(queryLogoutButton()).toBeInTheDocument()
    expect(queryLockWalletButton()).not.toBeInTheDocument()
  })

  it('shows "logout" and hides "lock wallet" while a taker coinjoin is running', () => {
    render(
      <AppNavbar
        {...defaults}
        sessionInfo={{ maker_running: false, coinjoin_in_process: true, schedule: undefined }}
      />,
    )

    expect(queryLogoutButton()).toBeInTheDocument()
    expect(queryLockWalletButton()).not.toBeInTheDocument()
  })

  it('shows "logout" and hides "lock wallet" while the scheduler is running', () => {
    render(<AppNavbar {...defaults} sessionInfo={{ maker_running: false, coinjoin_in_process: true, schedule: [] }} />)

    expect(queryLogoutButton()).toBeInTheDocument()
    expect(queryLockWalletButton()).not.toBeInTheDocument()
  })

  it('shows "logout" and hides "lock wallet" while a rescan is in progress', () => {
    render(<AppNavbar {...defaults} rescanInfo={{ rescanning: true, progress: undefined, updatedAt: Date.now() }} />)

    expect(queryLogoutButton()).toBeInTheDocument()
    expect(queryLockWalletButton()).not.toBeInTheDocument()
  })
})
