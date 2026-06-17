import type { ChangeEvent, ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UtxoSelectionDialog } from './UtxoSelectionDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('../ui/input', () => ({
  Input: ({
    value,
    onChange,
    disabled,
  }: {
    value?: string
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
  }) => <input value={value} onChange={onChange} disabled={disabled} data-testid="filter-input" />,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}))

vi.mock('../wallet/JarUtxosTable', () => ({
  JarUtxosTable: () => <div data-testid="jar-utxos-table" />,
}))

const baseProps = {
  open: true,
  isSubmitting: false,
  selectedCount: 2,
  filter: '',
  tableEntries: [],
  initialRowSelection: {},
  enableRowSelection: true,
  onOpenChange: vi.fn(),
  onFilterChange: vi.fn(),
  onRowSelectionChange: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
}

describe('UtxoSelectionDialog', () => {
  it('renders the dialog with the utxos table when open', () => {
    render(<UtxoSelectionDialog {...baseProps} />)

    expect(screen.getByText('show_utxos.title')).toBeInTheDocument()
    expect(screen.getByTestId('jar-utxos-table')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(<UtxoSelectionDialog {...baseProps} open={false} />)

    expect(screen.queryByText('show_utxos.title')).not.toBeInTheDocument()
  })

  it('calls onFilterChange when typing in the filter input', () => {
    const onFilterChange = vi.fn()
    render(<UtxoSelectionDialog {...baseProps} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByTestId('filter-input'), { target: { value: 'abc' } })
    expect(onFilterChange).toHaveBeenCalledWith('abc')
  })

  it('closes via the reject button and submits via the accept button', () => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<UtxoSelectionDialog {...baseProps} onOpenChange={onOpenChange} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByText('modal.confirm_button_reject'))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByText('modal.confirm_button_accept'))
    expect(onSubmit).toHaveBeenCalled()
  })

  it('shows a spinner while submitting', () => {
    render(<UtxoSelectionDialog {...baseProps} isSubmitting />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})
