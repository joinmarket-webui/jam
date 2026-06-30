import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderbookPage } from './OrderbookPage'

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

describe('OrderbookPage', () => {
  it('renders title and content', () => {
    render(<OrderbookPage />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('orderbook.title')

    const content = screen.getByTestId('orderbook-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
  })
})
