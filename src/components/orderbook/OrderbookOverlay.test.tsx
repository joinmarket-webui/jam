import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderbookOverlay } from './OrderbookOverlay'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/orderbook/OrderbookContent', () => ({
  OrderbookContent: ({ enabled, className }: { enabled: boolean; className?: string }) => (
    <div data-testid="orderbook-content" data-enabled={enabled} className={className}>
      orderbook-content
    </div>
  ),
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
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

describe('OrderbookOverlay', () => {
  it('renders dialog content when open', () => {
    render(<OrderbookOverlay open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('orderbook.title')

    const content = screen.getByTestId('orderbook-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
  })

  it('calls onOpenChange when closed', () => {
    const onOpenChange = vi.fn()
    render(<OrderbookOverlay open={true} onOpenChange={onOpenChange} />)

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when closed', () => {
    render(<OrderbookOverlay open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
