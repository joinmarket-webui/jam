import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalletJarsDetailsOverlay } from './WalletJarsDetailsOverlay'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }
type WalletJarsDetailsContentProps = {
  enabled?: boolean
  walletFileName?: string
  debug?: boolean
  selectedJarIndex?: number
  className?: string
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: true }),
}))

vi.mock('./WalletJarsDetailsContent', () => ({
  WalletJarsDetailsContent: ({
    enabled,
    walletFileName,
    debug,
    selectedJarIndex,
    className,
  }: WalletJarsDetailsContentProps) => (
    <div
      data-testid="wallet-jars-details-content"
      data-enabled={enabled}
      data-debug={debug}
      data-wallet={walletFileName}
      data-index={selectedJarIndex}
      className={className}
    >
      wallet-jars-details-content
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

describe('WalletJarsDetailsOverlay', () => {
  it('renders dialog content when open', () => {
    render(
      <WalletJarsDetailsOverlay
        open={true}
        onOpenChange={vi.fn()}
        walletFileName="test-wallet.jmdat"
        selectedJarIndex={2}
      />,
    )

    expect(screen.getByTestId('page-title')).toHaveTextContent('Wallet Jars Details')

    const content = screen.getByTestId('wallet-jars-details-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
    expect(content).toHaveAttribute('data-debug', 'true')
    expect(content).toHaveAttribute('data-wallet', 'test-wallet.jmdat')
    expect(content).toHaveAttribute('data-index', '2')
  })

  it('calls onOpenChange when closed', () => {
    const onOpenChange = vi.fn()
    render(<WalletJarsDetailsOverlay open={true} onOpenChange={onOpenChange} walletFileName="test-wallet.jmdat" />)

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when closed', () => {
    render(<WalletJarsDetailsOverlay open={false} onOpenChange={vi.fn()} walletFileName="test-wallet.jmdat" />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
