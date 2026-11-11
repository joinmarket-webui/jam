import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SweepStopConfirmDialog } from './SweepStopConfirmDialog'

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
        <button onClick={() => onOpenChange?.(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

describe('SweepStopConfirmDialog', () => {
  it('renders correctly', () => {
    render(<SweepStopConfirmDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isStopping={false} />)

    expect(screen.getByText('scheduler.confirm_stop_modal.title')).toBeInTheDocument()
    expect(screen.getByText('scheduler.confirm_stop_modal.text_body')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeInTheDocument()
    expect(screen.getByText('scheduler.button_stop')).toBeInTheDocument()
  })

  it('renders correctly when stopping', () => {
    render(<SweepStopConfirmDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isStopping={true} />)

    expect(screen.getByText('scheduler.button_stop')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeDisabled()
  })

  it('calls onConfirm when stop button is clicked', () => {
    const onConfirm = vi.fn()
    render(<SweepStopConfirmDialog open={true} onOpenChange={vi.fn()} onConfirm={onConfirm} isStopping={false} />)

    fireEvent.click(screen.getByText('scheduler.button_stop'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

