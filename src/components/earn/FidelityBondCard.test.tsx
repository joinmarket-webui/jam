import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { FidelityBondCard } from './FidelityBondCard'

type UtxoLike = { isFb?: boolean; locked?: boolean; locktime?: string }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      resolvedLanguage: 'en',
    },
  }),
  Trans: ({ i18nKey }: { i18nKey?: string }) => <div data-testid="trans">{i18nKey}</div>,
}))

vi.mock('@/lib/utils', () => ({
  time: {
    humanReadableDuration: ({ to }: { to: string }) => `in ${to} days`,
  },
  cn: (...args: unknown[]) => args.join(' '),
}))

vi.mock('@/lib/fidelityBondUtils', () => ({
  utxo: {
    isFidelityBond: vi.fn((value: UtxoLike) => value.isFb),
    isLocked: vi.fn((value: UtxoLike) => value.locked),
    getLocktime: vi.fn((value: UtxoLike) => value.locktime),
  },
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value?: string }) => <span data-testid="address">{value}</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <span data-testid="balance">{valueString}</span>,
}))

describe('FidelityBondCard', () => {
  const activeUtxo = {
    isFb: true,
    locked: true,
    locktime: '2025',
    path: 'm/0/0',
    utxo: 'txid:0',
    value: 100000,
    address: 'bc1...',
  } as unknown as FidelityBondUtxo

  const expiredUtxo = {
    ...activeUtxo,
    locked: false,
  }

  const nonFbUtxo = {
    ...activeUtxo,
    isFb: false,
  }

  it('renders nothing if utxo is not a fidelity bond', () => {
    const { container } = render(<FidelityBondCard value={nonFbUtxo} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders active fidelity bond', () => {
    render(<FidelityBondCard value={activeUtxo} />)

    expect(screen.getByText('earn.fidelity_bond.existing.title_active')).toBeInTheDocument()
    expect(screen.getByText('m/0/0')).toBeInTheDocument()
    expect(screen.getByTestId('balance')).toHaveTextContent('100000')

    expect(screen.getByText('earn.fidelity_bond.existing.label_locked_until')).toBeInTheDocument()
    expect(screen.getByText('2025 (in 2025 days)')).toBeInTheDocument()

    expect(screen.getByText('earn.fidelity_bond.existing.label_address')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('bc1...')
  })

  it('renders expired fidelity bond', () => {
    render(<FidelityBondCard value={expiredUtxo} />)

    expect(screen.getByTestId('trans')).toHaveTextContent('earn.fidelity_bond.existing.title_expired')
    expect(screen.getByText('earn.fidelity_bond.existing.label_expired_on')).toBeInTheDocument()
  })

  it('renders children in footer', () => {
    render(
      <FidelityBondCard value={activeUtxo}>
        <div data-testid="child">Child Content</div>
      </FidelityBondCard>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
