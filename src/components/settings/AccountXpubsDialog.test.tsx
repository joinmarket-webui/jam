import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { Network } from 'bitcoin-address-validation'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AccountXpubsAccordion, AccountXpubsDialog } from './AccountXpubsDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

type SeedQueryState = {
  data: string[] | undefined
  error: { message: string } | null
  isFetching: boolean
  dataUpdatedAt: number
}

type XpubsQueryState = {
  data: unknown[] | undefined
  error: { message: string } | null
  isFetching: boolean
  dataUpdatedAt: number
}

// Mutable holder for mock return values, reset in beforeEach.
const h = vi.hoisted(() => ({
  network: 'mainnet',
  jars: [] as unknown[],
  seed: {
    data: undefined as string[] | undefined,
    error: null as { message: string } | null,
    isFetching: false,
    dataUpdatedAt: 0,
  },
  xpubs: {
    data: [] as unknown[] | undefined,
    error: null as { message: string } | null,
    isFetching: false,
    dataUpdatedAt: 0,
  },
  seedRefetch: vi.fn(() => Promise.resolve()),
  removeQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  getseedOptions: vi.fn(() => ({ queryKey: ['mock'], queryFn: vi.fn() })),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => {
      h.toastSuccess(message)
    },
    error: (message: string) => {
      h.toastError(message)
    },
  },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    // The component calls useQuery twice: the seed query (has `select`) and the
    // accountXpubs query (has `queryFn` but no `select`). Distinguish by `select`.
    useQuery: (options: { select?: unknown; queryKey?: unknown }) => {
      if (options.select !== undefined) {
        return {
          data: h.seed.data,
          error: h.seed.error,
          isFetching: h.seed.isFetching,
          dataUpdatedAt: h.seed.dataUpdatedAt,
          refetch: h.seedRefetch,
        } as unknown as UseQueryResult
      }
      return {
        data: h.xpubs.data,
        error: h.xpubs.error,
        isFetching: h.xpubs.isFetching,
        dataUpdatedAt: h.xpubs.dataUpdatedAt,
      } as unknown as UseQueryResult
    },
    useQueryClient: () => ({ removeQueries: h.removeQueries }),
  }
})

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJars: () => ({ jars: h.jars }),
  useDetectNetwork: () => ({ network: h.network }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('../utils/PasswordVerificationForm', () => ({
  PasswordVerificationForm: ({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) => (
    <>
      <button onClick={onSubmit}>Verify Password</button>
      <button onClick={onCancel}>Cancel Verification</button>
    </>
  ),
}))

vi.mock('../ui/jam/BitcoinQrCode', () => ({
  BitcoinXpubQrCode: ({ xpub }: { xpub: string }) => <div data-testid="qr-code">{xpub}</div>,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

const setSeed = (state: Partial<SeedQueryState>) => {
  Object.assign(h.seed, state)
}
const setXpubs = (state: Partial<XpubsQueryState>) => {
  Object.assign(h.xpubs, state)
}

const verify = () => {
  fireEvent.click(screen.getByText('Verify Password'))
}

beforeEach(() => {
  h.network = 'mainnet'
  h.jars = []
  h.seed = { data: undefined, error: null, isFetching: false, dataUpdatedAt: 0 }
  h.xpubs = { data: [], error: null, isFetching: false, dataUpdatedAt: 0 }
  h.seedRefetch.mockClear()
  h.removeQueries.mockClear()
  h.toastSuccess.mockClear()
  h.toastError.mockClear()
})

describe('AccountXpubsAccordion', () => {
  it('renders multiple accounts and their xpubs', () => {
    const mockValues = [
      {
        accountIndex: 0,
        accountName: 'Default',
        path: "m/84'/0'/0'",
        xpubs: [
          {
            name: 'zpub',
            network: Network.mainnet,
            path: "m/84'/0'/0'",
            xpub: 'zpub123',
          },
        ],
      },
    ]

    render(<AccountXpubsAccordion values={mockValues} />)

    expect(screen.getByText('Default')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Default'))
    expect(screen.getByText('zpub123')).toBeInTheDocument()
  })
})

describe('AccountXpubsDialog', () => {
  it('renders password verification form initially', () => {
    render(
      <AccountXpubsDialog
        open={true}
        onOpenChange={vi.fn()}
        walletFileName="test.jmdat"
        hashedPassword="hash"
        autoCloseTimeout={5000}
      />,
    )

    expect(screen.getByText('settings.xpubs_modal.verification.title')).toBeInTheDocument()
    expect(screen.getByText('Verify Password')).toBeInTheDocument()
  })

  it('renders xpubs after password is verified', () => {
    render(
      <AccountXpubsDialog
        open={true}
        onOpenChange={vi.fn()}
        walletFileName="test.jmdat"
        hashedPassword="hash"
        autoCloseTimeout={5000}
      />,
    )

    fireEvent.click(screen.getByText('Verify Password'))

    expect(screen.getByText('settings.xpubs_modal.title')).toBeInTheDocument()
  })

  const renderDialog = (onOpenChange = vi.fn()) =>
    render(
      <AccountXpubsDialog
        open={true}
        onOpenChange={onOpenChange}
        walletFileName="test.jmdat"
        hashedPassword="hash"
        autoCloseTimeout={5000}
      />,
    )

  it('shows a loading spinner while the xpubs are being derived', () => {
    setSeed({ data: ['word'] })
    setXpubs({ data: undefined, isFetching: true })
    renderDialog()
    verify()
    expect(screen.getByText('global.loading')).toBeInTheDocument()
  })

  it('renders the derived account xpubs once loaded', () => {
    setSeed({ data: ['word'] })
    setXpubs({
      data: [
        {
          accountIndex: 0,
          accountName: 'Default',
          path: "m/84'/0'/0'",
          xpubs: [{ name: 'zpub', network: Network.mainnet, path: "m/84'/0'/0'", xpub: 'zpub-loaded' }],
        },
      ],
    })
    renderDialog()
    verify()
    expect(screen.getByText('settings.xpubs_modal.text_info_title')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('shows the no-data message when there are no xpubs', () => {
    setSeed({ data: ['word'] })
    setXpubs({ data: [] })
    renderDialog()
    verify()
    expect(screen.getByText('settings.xpubs_modal.text_error_no_data')).toBeInTheDocument()
  })

  it('shows an error alert when the seed query fails', () => {
    setSeed({ data: undefined, error: { message: 'seed boom' } })
    setXpubs({ data: undefined })
    renderDialog()
    verify()
    expect(screen.getByText('seed boom')).toBeInTheDocument()
  })

  it('shows an error alert when the xpubs query fails', () => {
    setSeed({ data: ['word'] })
    setXpubs({ data: undefined, error: { message: 'xpub boom' } })
    renderDialog()
    verify()
    expect(screen.getByText('xpub boom')).toBeInTheDocument()
  })

  it('closes and clears cached queries via the close button', () => {
    setSeed({ data: ['word'] })
    setXpubs({ data: [] })
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)
    verify()
    fireEvent.click(screen.getByText('global.close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(h.removeQueries).toHaveBeenCalled()
  })

  it('clears cached queries when verification is cancelled', () => {
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)
    fireEvent.click(screen.getByText('Cancel Verification'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(h.removeQueries).toHaveBeenCalled()
  })
})
