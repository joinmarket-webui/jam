import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthPageShell } from './AuthPageShell'

describe('AuthPageShell', () => {
  it('renders children with background gradient', () => {
    render(
      <AuthPageShell>
        <div data-testid="child">Child Content</div>
      </AuthPageShell>,
    )

    const child = screen.getByTestId('child')
    expect(child).toBeInTheDocument()
    expect(child.parentElement).toHaveClass('from-background', 'to-muted', 'flex', 'min-h-screen')
  })
})
