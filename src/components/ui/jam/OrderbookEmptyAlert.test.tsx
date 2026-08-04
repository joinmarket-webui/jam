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
  it('renders title, description and link to orderbook page', () => {
    render(<OrderbookEmptyAlert />)

    expect(screen.getByText('orderbook.alert_precheck_empty_title')).toBeInTheDocument()
    expect(screen.getByText(/orderbook.alert_precheck_empty_description/u)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/orderbook')
  })
})
