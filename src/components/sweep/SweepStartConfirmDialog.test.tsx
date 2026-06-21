import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SweepStartConfirmDialog } from './SweepStartConfirmDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock Dialog
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <span data-testid="spinner">spinner</span>,
}))

describe('SweepStartConfirmDialog', () => {
  it('renders content correctly when open', () => {
    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        disabled={false}
        isStarting={false}
      />,
    )

    expect(screen.getByText('scheduler.confirm_modal.title')).toBeInTheDocument()
    expect(screen.getByText('scheduler.confirm_modal.body')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_accept')).toBeInTheDocument()
  })

  it('renders spinner when isStarting is true', () => {
    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        disabled={true}
        isStarting={true}
      />,
    )

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.getByText('scheduler.button_start')).toBeInTheDocument()
    expect(screen.queryByText('modal.confirm_button_accept')).not.toBeInTheDocument()

    // Check buttons are disabled
    const rejectButton = screen.getByText('modal.confirm_button_reject')
    expect(rejectButton).toBeDisabled()

    const acceptButton = screen.getByText('scheduler.button_start').closest('button')
    expect(acceptButton).toBeDisabled()
  })

  it('calls onConfirm when accept is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        disabled={false}
        isStarting={false}
      />,
    )

    fireEvent.click(screen.getByText('modal.confirm_button_accept'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange when reject is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        disabled={false}
        isStarting={false}
      />,
    )

    fireEvent.click(screen.getByText('modal.confirm_button_reject'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
