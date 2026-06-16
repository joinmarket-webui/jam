import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EarnReportPage } from './EarnReportPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./EarnReportContent', () => ({
  EarnReportContent: ({ enabled, className }: { enabled: boolean; className?: string }) => (
    <div data-testid="earn-report-content" data-enabled={enabled} className={className}>
      earn-report-content
    </div>
  ),
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title }: { title: string }) => <h1 data-testid="page-title">{title}</h1>,
}))

describe('EarnReportPage', () => {
  it('renders title and content', () => {
    // @ts-expect-error test
    render(<EarnReportPage walletFileName="test-wallet" />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('earn.report.title')

    const content = screen.getByTestId('earn-report-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
  })
})
