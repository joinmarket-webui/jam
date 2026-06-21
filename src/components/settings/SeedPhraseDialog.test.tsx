import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WalletFileName } from '@/lib/utils'
import { SeedPhraseDialog } from './SeedPhraseDialog'

type SeedQuery = {
  data?: string[]
  error?: { message: string }
  isFetching: boolean
  refetch: () => Promise<unknown>
  dataUpdatedAt: number
}

const refetch = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined)
const removeQueries = vi.fn()
let seedQuery: SeedQuery

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  getseedOptions: () => ({ queryKey: ['seed'] }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => seedQuery,
  useQueryClient: () => ({ removeQueries }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('../ui/jam/SeedPhraseGrid', () => ({
  SeedPhraseGrid: ({ value }: { value: string[] }) => <div data-testid="seed-grid">{value.join(' ')}</div>,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}))

vi.mock('../ui/switch', () => ({
  Switch: ({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) => (
    <button data-testid="reveal-switch" onClick={() => onCheckedChange?.(true)} />
  ),
}))

vi.mock('../utils/PasswordVerificationForm', () => ({
  PasswordVerificationForm: ({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) => (
    <div>
      <button data-testid="verify" onClick={onSubmit} />
      <button data-testid="cancel" onClick={onCancel} />
    </div>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}))

const baseProps = {
  open: true,
  walletFileName: 'wallet.jmdat' as WalletFileName,
  hashedPassword: 'hash',
  autoCloseTimeout: 60_000,
}

const verify = () => fireEvent.click(screen.getByTestId('verify'))

describe('SeedPhraseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seedQuery = { data: undefined, error: undefined, isFetching: false, refetch, dataUpdatedAt: 0 }
  })

  it('shows the password verification form before verification', () => {
    render(<SeedPhraseDialog {...baseProps} onOpenChange={vi.fn()} />)
    expect(screen.getByText('settings.seed_modal.verification.title')).toBeInTheDocument()
  })

  it('shows a spinner while fetching after verification', () => {
    seedQuery = { ...seedQuery, isFetching: true }
    render(<SeedPhraseDialog {...baseProps} onOpenChange={vi.fn()} />)
    verify()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders the seed grid and toggles reveal after verification', () => {
    seedQuery = { ...seedQuery, data: ['word1', 'word2'] }
    render(<SeedPhraseDialog {...baseProps} onOpenChange={vi.fn()} />)
    verify()
    expect(screen.getByTestId('seed-grid')).toHaveTextContent('word1 word2')
    fireEvent.click(screen.getByTestId('reveal-switch'))
  })

  it('renders an error alert when the seed query fails', () => {
    seedQuery = { ...seedQuery, error: { message: 'failed' } }
    render(<SeedPhraseDialog {...baseProps} onOpenChange={vi.fn()} />)
    verify()
    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('closes and clears the cached seed query', () => {
    const onOpenChange = vi.fn()
    render(<SeedPhraseDialog {...baseProps} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByTestId('cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['seed'] })
  })
})
