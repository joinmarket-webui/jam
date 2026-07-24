import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { parseSemanticVersion } from '@/lib/utils'
import { BetaWarningDialog } from './BetaWarningDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: React.ReactNode }) => children ?? i18nKey ?? null,
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
  it('renders the joinmarket-ng warning and backend details', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={parseSemanticVersion('2.0.0-beta.1')}
        backendVersion={parseSemanticVersion('0.33.0')}
        backendName="joinmarket-ng"
      />,
    )

    expect(screen.getByText('footer.warning_alert_text_ng')).toBeInTheDocument()
    expect(screen.getByTestId('BetaWarningDialog#backendName')).toHaveTextContent('joinmarket-ng')
    expect(screen.getByTestId('BetaWarningDialog#backendVersion')).toHaveTextContent('0.33.0')
    expect(screen.getByTestId('BetaWarningDialog#jamVersion')).toHaveTextContent('2.0.0-beta.1')
  })

  it('renders fallback warning and generic backend label when backend is unknown', () => {
    render(<BetaWarningDialog open={true} onOpenChange={vi.fn()} jamVersion={parseSemanticVersion('2.0.0')} />)

    expect(screen.getByText('footer.warning_alert_text_ng')).toBeInTheDocument()
    expect(screen.getByTestId('BetaWarningDialog#backendName')).toHaveTextContent('unknown')
    expect(screen.getByTestId('BetaWarningDialog#backendVersion')).toHaveTextContent('unknown')
    expect(screen.getByTestId('BetaWarningDialog#jamVersion')).toHaveTextContent('2.0.0')
  })

  it('renders standalone-ng warning with correct display name', () => {
    render(
      <BetaWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        jamVersion={parseSemanticVersion('2.0.0-beta.0')}
        backendVersion={parseSemanticVersion('v0.33.0')}
        backendName="jam-standalone (joinmarket-ng)"
      />,
    )

    expect(screen.getByText('footer.warning_alert_text_ng')).toBeInTheDocument()
    expect(screen.getByTestId('BetaWarningDialog#backendName')).toHaveTextContent('jam-standalone (joinmarket-ng)')
    expect(screen.getByTestId('BetaWarningDialog#backendVersion')).toHaveTextContent('v0.33.0')
    expect(screen.getByTestId('BetaWarningDialog#jamVersion')).toHaveTextContent('2.0.0-beta.0')
  })
})
