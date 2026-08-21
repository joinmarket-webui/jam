import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  SeedPhraseGrid: ({ value, masked }: { value: string[]; masked: boolean }) => (
    <div data-testid="seed-grid" data-masked={masked}>
      {value.join(' ')}
    </div>
  ),
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

  afterEach(() => vi.useRealTimers())

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

  it('clears and masks the cached seed when verification expires', async () => {
    vi.useFakeTimers()
    seedQuery = { ...seedQuery, data: ['word1', 'word2'] }
    render(<SeedPhraseDialog {...baseProps} autoCloseTimeout={1_000} onOpenChange={vi.fn()} />)

    verify()
    fireEvent.click(screen.getByTestId('reveal-switch'))
    expect(screen.getByTestId('seed-grid')).toHaveAttribute('data-masked', 'false')

    await act(() => vi.advanceTimersByTimeAsync(1_332))
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['seed'] })

    verify()
    expect(screen.getByTestId('seed-grid')).toHaveAttribute('data-masked', 'true')
  })
})
