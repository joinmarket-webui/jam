import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SendCoinjoinPreconditionAlert } from '@/components/send/SendCoinjoinPreconditionAlert'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { SweepPreconditionAlert } from './SweepPreconditionAlert'
import type { SweepPreconditionSummary } from './preconditions'

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: unknown }) =>
    values ? `${i18nKey}:${JSON.stringify(values)}` : i18nKey,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <span data-testid="balance">{valueString}sats</span>,
}))

const retryLockedUtxo: Utxo = {
  address: 'bc1qretry',
  confirmations: 12,
  frozen: false,
  label: '',
  locktime: undefined,
  mixdepth: 0,
  path: '',
  tries: 3,
  external: false,
  tries_remaining: 0,
  utxo: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef:0',
  value: 123_456,
}

const makeSummary = (overrides: Partial<SweepPreconditionSummary> = {}): SweepPreconditionSummary => ({
  isFulfilled: false,
  numberOfMissingConfirmations: 0,
  numberOfMissingUtxos: 0,
  numberOfNonFrozenFidelityBondOutputs: 0,
  options: {
    minConfirmations: 5,
    minNumberOfUtxos: 1,
    maxNumberOfNonFrozenFidelityBondOutputs: 0,
  },
  retryLockedUtxos: [],
  ...overrides,
})

describe('precondition alerts', () => {
  it('renders nothing when preconditions are fulfilled', () => {
    const summary = makeSummary({ isFulfilled: true })
    const { container: sendContainer } = render(<SendCoinjoinPreconditionAlert summary={summary} />)
    const { container: sweepContainer } = render(<SweepPreconditionAlert summary={summary} />)

    expect(sendContainer).toBeEmptyDOMElement()
    expect(sweepContainer).toBeEmptyDOMElement()
  })

  it('shows missing utxo warnings for send and sweep flows', () => {
    const summary = makeSummary({ numberOfMissingUtxos: 1 })

    render(
      <>
        <SendCoinjoinPreconditionAlert summary={summary} />
        <SweepPreconditionAlert summary={summary} />
      </>,
    )

    expect(screen.getByText('send.coinjoin_precondition.hint_missing_utxos:{"minConfirmations":5}')).toBeInTheDocument()
    expect(screen.getByText('scheduler.precondition.hint_missing_utxos:{"minConfirmations":5}')).toBeInTheDocument()
  })

  it('shows missing confirmation warnings for send and sweep flows', () => {
    const summary = makeSummary({ numberOfMissingConfirmations: 3 })

    render(
      <>
        <SendCoinjoinPreconditionAlert summary={summary} />
        <SweepPreconditionAlert summary={summary} />
      </>,
    )

    expect(
      screen.getByText(
        'send.coinjoin_precondition.hint_missing_confirmations:{"minConfirmations":5,"amountOfMissingConfirmations":3}',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'scheduler.precondition.hint_missing_confirmations:{"minConfirmations":5,"amountOfMissingConfirmations":3}',
      ),
    ).toBeInTheDocument()
  })

  it('shows non-frozen fidelity bond warnings for send and sweep flows', () => {
    const summary = makeSummary({ numberOfNonFrozenFidelityBondOutputs: 3 })

    render(
      <>
        <SendCoinjoinPreconditionAlert summary={summary} />
        <SweepPreconditionAlert summary={summary} />
      </>,
    )

    expect(screen.getByText('send.coinjoin_precondition.hint_non_frozen_fidelity_bond:{"count":3}')).toBeInTheDocument()
    expect(screen.getByText('scheduler.precondition.hint_non_frozen_fidelity_bond:{"count":3}')).toBeInTheDocument()
  })

  it('lists retry-locked utxos when retries are the remaining blocker', () => {
    const summary = makeSummary({ retryLockedUtxos: [retryLockedUtxo] })

    render(
      <>
        <SendCoinjoinPreconditionAlert summary={summary} />
        <SweepPreconditionAlert summary={summary} />
      </>,
    )

    expect(screen.getByText('send.coinjoin_precondition.hint_missing_retries')).toBeInTheDocument()
    expect(screen.getByText('scheduler.precondition.hint_missing_retries')).toBeInTheDocument()
    expect(screen.getAllByText('global.utxos')).toHaveLength(2)
    expect(screen.getAllByText('123456sats')).toHaveLength(2)
  })
})
