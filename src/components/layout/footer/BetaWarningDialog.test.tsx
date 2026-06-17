import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BetaWarningDialog } from './BetaWarningDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open !== false ? (
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

describe('BetaWarningDialog', () => {
  it('renders correctly', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '1.0.0', major: 1, minor: 0, patch: 0, prerelease: [] }}
        joinmarketVersion={{ raw: '0.9.3', major: 0, minor: 9, patch: 3, prerelease: [] }}
      />,
    )

    expect(screen.getByText('footer.warning_alert_title')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v0.9.3')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_button_ok')).toBeInTheDocument()
  })

  it('renders correctly with missing joinmarket version', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '1.0.0', major: 1, minor: 0, patch: 0, prerelease: [] }}
      />,
    )

    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v_unknown')).toBeInTheDocument()
  })
})
