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
  it('renders the clientserver warning and backend details', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '1.0.0', major: 1, minor: 0, patch: 0 }}
        joinmarketVersion={{ raw: '0.9.3', major: 0, minor: 9, patch: 3 }}
        backendName="joinmarket-clientserver"
      />,
    )

    expect(screen.getByText('footer.warning_alert_title')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_backend:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_backend_version:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_jam_version:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('joinmarket-clientserver')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v0.9.3')).toBeInTheDocument()
    expect(screen.getByText('footer.warning_alert_button_ok')).toBeInTheDocument()
  })

  it('renders the joinmarket-ng warning and backend details', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '2.0.0-beta.0', major: 2, minor: 0, patch: 0 }}
        joinmarketVersion={{ raw: '0.33.0', major: 0, minor: 33, patch: 0 }}
        backendName="joinmarket-ng"
      />,
    )

    expect(screen.getByText('footer.warning_alert_text_ng')).toBeInTheDocument()
    expect(screen.getByText('joinmarket-ng')).toBeInTheDocument()
    expect(screen.getByText('v2.0.0-beta.0')).toBeInTheDocument()
    expect(screen.getByText('v0.33.0')).toBeInTheDocument()
  })

  it('renders fallback warning and generic backend label when backend is unknown', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '1.0.0', major: 1, minor: 0, patch: 0 }}
      />,
    )

    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    // Generic fallback when backend info not yet loaded
    expect(screen.getByText('JoinMarket')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('v_unknown')).toBeInTheDocument()
  })

  it('renders standalone-ng warning with correct display name', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '2.0.0-beta.0', major: 2, minor: 0, patch: 0 }}
        joinmarketVersion={{ raw: '0.33.0', major: 0, minor: 33, patch: 0 }}
        backendName="jam-standalone (joinmarket-ng)"
      />,
    )

    expect(screen.getByText('footer.warning_alert_text_ng')).toBeInTheDocument()
    expect(screen.getByText('jam-standalone (joinmarket-ng)')).toBeInTheDocument()
  })

  it('renders standalone-clientserver warning with correct display name', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={{ raw: '2.0.0-beta.0', major: 2, minor: 0, patch: 0 }}
        joinmarketVersion={{ raw: '0.9.11', major: 0, minor: 9, patch: 11 }}
        backendName="jam-standalone (joinmarket-clientserver)"
      />,
    )

    expect(screen.getByText('footer.warning_alert_text')).toBeInTheDocument()
    expect(screen.getByText('jam-standalone (joinmarket-clientserver)')).toBeInTheDocument()
  })
})
