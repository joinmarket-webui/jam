import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { MoveToJarDialog } from './MoveToJarDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }
type ValueProps = { value: string }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { address: 'bc111' }, isLoading: false }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({})),
  freezeMutation: vi.fn(() => ({})),
  getaddressOptions: vi.fn(() => ({ queryKey: ['mock'], queryFn: vi.fn() })),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: { calculatedAvailableBalanceInSats: 5000 },
        utxos: [{ utxo: 'tx1:0', value: 1000, frozen: false }],
      },
      {
        jarIndex: 1,
        name: 'Jar 1',
        color: '#111',
        balanceSummary: { calculatedAvailableBalanceInSats: 1000 },
        utxos: [],
      },
    ],
    refetch: vi.fn(),
  }),
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

vi.mock('@/components/ui/jam/Address', () => ({
  Address: ({ value }: ValueProps) => <div data-testid="address">{value}</div>,
}))

describe('MoveToJarDialog', () => {
  const utxo = {
    utxo: 'tx1:0',
    value: 1000,
    mixdepth: 0,
    confirmations: 10,
    address: 'bc1',
    frozen: false,
  } as unknown as FidelityBondUtxo

  it('renders correctly on first step', () => {
    render(<MoveToJarDialog open={true} onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={utxo} />)

    expect(screen.getByText('earn.fidelity_bond.move.title')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.move.select_jar.description')).toBeInTheDocument()
    expect(screen.getByText('Jar 1')).toBeInTheDocument() // Destination jar
  })

  it('can proceed to confirm step', () => {
    render(<MoveToJarDialog open={true} onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={utxo} />)

    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('earn.fidelity_bond.select_date.text_primary_button'))

    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_jar_n {"jar":0}')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_jar_n {"jar":1}')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('bc111')
  })
})
