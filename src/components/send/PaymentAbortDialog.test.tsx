import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentAbortDialog } from './PaymentAbortDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../ui/dialog', () => ({
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
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

describe('PaymentAbortDialog', () => {
  it('renders correctly', () => {
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isConfirming={false} />)

    expect(screen.getByText('send.confirm_abort_modal.title')).toBeInTheDocument()
    expect(screen.getByText('send.confirm_abort_modal.text_body')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeInTheDocument()
    expect(screen.getByText('global.abort')).toBeInTheDocument()
  })

  it('renders correctly when confirming', () => {
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isConfirming={true} />)

    // The button has a spinner and text when confirming
    expect(screen.getByText('global.abort')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeDisabled()
  })

  it('calls onConfirm when abort button is clicked', () => {
    const onConfirm = vi.fn()
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={onConfirm} isConfirming={false} />)

    fireEvent.click(screen.getByText('global.abort'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
