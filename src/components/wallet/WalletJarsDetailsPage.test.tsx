import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalletJarsDetailsPage } from './WalletJarsDetailsPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/store/jamSettingsStore', () => ({
  useDeveloperMode: () => ({ enabled: true }),
}))

type WalletJarsDetailsContentProps = {
  enabled?: boolean
  walletFileName?: string
  debug?: boolean
  className?: string
}

vi.mock('./WalletJarsDetailsContent', () => ({
  WalletJarsDetailsContent: ({ enabled, walletFileName, debug, className }: WalletJarsDetailsContentProps) => (
    <div
      data-testid="wallet-jars-details-content"
      data-enabled={enabled}
      data-debug={debug}
      data-wallet={walletFileName}
      className={className}
    >
      wallet-jars-details-content
    </div>
  ),
}))

vi.mock('@/components/ui/jam/PageTitle', () => ({
  default: ({ title }: { title: string }) => <h1 data-testid="page-title">{title}</h1>,
}))

describe('WalletJarsDetailsPage', () => {
  it('renders title and content', () => {
    // @ts-expect-error test
    render(<WalletJarsDetailsPage walletFileName="test-wallet" />)

    expect(screen.getByTestId('page-title')).toHaveTextContent('jar_details.title')

    const content = screen.getByTestId('wallet-jars-details-content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-enabled', 'true')
    expect(content).toHaveAttribute('data-debug', 'true')
    expect(content).toHaveAttribute('data-wallet', 'test-wallet')
  })
})
