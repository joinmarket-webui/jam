import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TxHistoryOverlay } from './TxHistoryOverlay'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./TxHistoryContent', () => ({
  TxHistoryContent: ({ walletFileName }: { walletFileName: string }) => (
    <div data-testid="tx-history-content" data-wallet={walletFileName}>
      Content
    </div>
  ),
}))

vi.mock('../ui/jam/PageTitle', () => ({
  default: ({ title }: { title: string }) => <h1 data-testid="page-title">{title}</h1>,
}))

// Mock Dialog to avoid dealing with portals and radix UI internals
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
}))

describe('TxHistoryOverlay', () => {
  it('renders dialog content when open', () => {
    render(<TxHistoryOverlay open={true} onOpenChange={vi.fn()} walletFileName="test-wallet.jmdat" />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('tx_history.overlay_title')

    const content = screen.getByTestId('tx-history-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-wallet', 'test-wallet.jmdat')
  })

  it('calls onOpenChange when closed', () => {
    const onOpenChange = vi.fn()
    render(<TxHistoryOverlay open={true} onOpenChange={onOpenChange} walletFileName="test-wallet.jmdat" />)

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when closed', () => {
    render(<TxHistoryOverlay open={false} onOpenChange={vi.fn()} walletFileName="test-wallet.jmdat" />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
