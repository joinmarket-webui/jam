import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LockWalletConfirmDialog } from './LockWalletConfirmDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }
type MutationOptions = { mutationFn: (input: unknown) => Promise<unknown> }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn }: MutationOptions) => ({
    mutateAsync: mutationFn,
    isPending: false,
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

describe('LockWalletConfirmDialog', () => {
  it('renders correctly', () => {
    render(
      <LockWalletConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        makerRunning={false}
        coinjoinInProgress={false}
      />,
    )

    expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_title')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_alternative_action_text')).toBeInTheDocument()
    expect(screen.getByText('global.cancel')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.button_lock')).toBeInTheDocument()
  })

  it('renders alerts when maker or coinjoin is running', () => {
    render(
      <LockWalletConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        makerRunning={true}
        coinjoinInProgress={true}
      />,
    )

    expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_maker_running_text')).toBeInTheDocument()
    expect(screen.getByText('wallets.wallet_preview.modal_lock_wallet_coinjoin_in_progress_text')).toBeInTheDocument()
  })

  it('calls onConfirm when lock button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <LockWalletConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        makerRunning={false}
        coinjoinInProgress={false}
      />,
    )

    fireEvent.click(screen.getByText('wallets.wallet_preview.button_lock'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
