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

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span data-testid="balance">{valueString}</span>,
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span data-testid="address">{value}</span>,
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

    expect(screen.getByText('scheduler.confirm_start_modal.title')).toBeInTheDocument()
    expect(screen.getByText('scheduler.confirm_start_modal.text_body')).toBeInTheDocument()
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

  it('renders schedule details when provided', () => {
    const mockSchedule = {
      entries: [{ id: '1' }, { id: '2' }],
      summary: {
        externalDestinations: [{ address: 'bc1qdestination1' }, { address: 'bc1qdestination2' }],
      },
    }

    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        disabled={false}
        isStarting={false}
        totalBalanceInSats={150000}
        schedule={mockSchedule as never}
      />,
    )

    expect(screen.getByText('scheduler.complete_wallet_title')).toBeInTheDocument()
    expect(screen.getByText('150000')).toBeInTheDocument()
    expect(screen.getByText('scheduler.section_details_title')).toBeInTheDocument()
    expect(screen.getByText('2 actions')).toBeInTheDocument()
    expect(screen.getByText('scheduler.section_destinations_title')).toBeInTheDocument()
    expect(screen.getByText('bc1qdestination1')).toBeInTheDocument()
    expect(screen.getByText('bc1qdestination2')).toBeInTheDocument()
  })

  it('renders explicit destinationAddresses when provided', () => {
    render(
      <SweepStartConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        disabled={false}
        isStarting={false}
        destinationAddresses={['bc1qcustomaddress']}
      />,
    )

    expect(screen.getByText('scheduler.section_destinations_title')).toBeInTheDocument()
    expect(screen.getByText('bc1qcustomaddress')).toBeInTheDocument()
  })
})
