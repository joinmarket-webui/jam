import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogsPage } from './LogsPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/LogsContent', () => ({
  LogsContent: ({ enabled, className }: { enabled: boolean; className?: string }) => (
    <div data-testid="logs-content" data-enabled={enabled} className={className}>
      logs-content
    </div>
  ),
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title }: { title: string }) => <h1 data-testid="page-title">{title}</h1>,
}))

describe('LogsPage', () => {
  it('renders title and content', () => {
    render(<LogsPage />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('logs.title')

    const content = screen.getByTestId('logs-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
  })
})
