import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ErrorPage from './ErrorPage'

const routeError = vi.fn<() => unknown>()

vi.mock('react-router-dom', () => ({
  useRouteError: () => routeError(),
}))

vi.mock('i18next', () => ({
  t: (key: string) => key,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
}))

describe('ErrorPage', () => {
  it('renders error details when error is an Error instance', () => {
    const error = new Error('boom')
    error.stack = 'stacktrace-line'
    routeError.mockReturnValue(error)

    render(<ErrorPage />)

    expect(screen.getByText('error_page.error_with_details.title')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(screen.getByText('stacktrace-line')).toBeInTheDocument()
  })

  it('renders unknown error reason and stacktrace for a non-Error object', () => {
    routeError.mockReturnValue({ message: 'object-message', stack: 'object-stack' })

    render(<ErrorPage />)

    expect(screen.getByText('error_page.unknown_error.title')).toBeInTheDocument()
    expect(screen.getByText('object-message')).toBeInTheDocument()
    expect(screen.getByText('object-stack')).toBeInTheDocument()
  })

  it('falls back to reason_unknown for a non-object error', () => {
    routeError.mockReturnValue(null)

    render(<ErrorPage />)

    expect(screen.getByText('error_page.unknown_error.title')).toBeInTheDocument()
    expect(screen.getByText('global.errors.reason_unknown')).toBeInTheDocument()
  })

  it('falls back to reason_unknown when object has no message', () => {
    routeError.mockReturnValue({ foo: 'bar' })

    render(<ErrorPage />)

    expect(screen.getByText('global.errors.reason_unknown')).toBeInTheDocument()
  })
})
