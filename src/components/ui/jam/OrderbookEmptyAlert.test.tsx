import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderbookEmptyAlert } from './OrderbookEmptyAlert'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({ i18nKey, components }: { i18nKey: string; components?: Record<string, ReactNode> }) => (
    <span>
      {i18nKey}
      {components?.['1']}
    </span>
  ),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

describe('OrderbookEmptyAlert', () => {
  it('renders title, description, button and link to orderbook page', () => {
    render(<OrderbookEmptyAlert isChecking={false} onCheckClick={async () => {}} />)

    expect(screen.getByText('orderbook.alert_precheck_empty_title')).toBeInTheDocument()
    expect(screen.getByText(/orderbook.alert_precheck_empty_description/u)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/orderbook')

    const actionCheck = screen.getByRole('button', { name: 'orderbook.alert_precheck_empty_text_button_check' })
    expect(actionCheck).toBeEnabled()

    const actionChecking = screen.queryByRole('button', { name: 'orderbook.alert_precheck_empty_text_button_checking' })
    expect(actionChecking).not.toBeInTheDocument()
  })

  it('disables button while checking', () => {
    render(<OrderbookEmptyAlert isChecking={true} onCheckClick={async () => {}} />)

    const actionChecking = screen.getByRole('button', { name: 'orderbook.alert_precheck_empty_text_button_checking' })
    expect(actionChecking).toBeDisabled()

    const actionCheck = screen.queryByRole('button', { name: 'orderbook.alert_precheck_empty_text_button_check' })
    expect(actionCheck).not.toBeInTheDocument()
  })
})
