import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import type { SendFormValues } from './types'

vi.mock('react-i18next', () => ({
  Trans: ({ children, i18nKey }: { children?: ReactNode; i18nKey: string }) => (
    <span>
      {i18nKey}
      {children}
    </span>
  ),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('../dev/DevBadge', () => ({
  DevBadge: () => <span>dev-badge</span>,
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>address:{value}</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>balance:{valueString}</span>,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <span>spinner</span>,
}))

const feeConfigValues: JamFeeConfigValues = {
  maxCjAbsoluteFee: 500,
  maxCjRelativeFee: 0.01,
  txFeeFactor: 0.25,
  txFee: {
    txFeeInBlocks: 6,
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
  },
}

const sourceJar: Jar = {
  balanceSummary: {
    calculatedAvailableBalanceInSats: 50_000,
    calculatedTotalBalanceInSats: 50_000,
    calculatedConfirmedAvailableBalanceInSats: 50_000,
    calculatedAvailableFrozenBalanceInSats: 0,
    calculatedFrozenOrLockedBalanceInSats: 0,
  },
  color: '#e2b86a',
  jarIndex: 0,
  name: 'Source jar',
  utxos: [],
}

const destinationJar: Jar = {
  ...sourceJar,
  jarIndex: 1,
  name: 'Destination jar',
}

const makeUtxo = (overrides: Partial<Utxo>): Utxo =>
  ({
    utxo: 'tx:0',
    address: 'bcrt1qsource',
    value: 10_000,
    frozen: false,
    locktime: undefined,
    ...overrides,
  }) as Utxo

const baseValues: SendFormValues = {
  amount: {
    amount: 12_000,
    isSweep: false,
    sweepAmount: undefined,
    sweepUtxos: undefined,
  },
  destination: {
    address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    fromJar: undefined,
  },
  isCoinJoin: false,
  source: {
    fromJar: 0,
  },
  txFee: {
    txFeeInBlocks: 6,
    txFeeInSatsPerVbyte: undefined,
    txFeeUnit: TX_FEE_UNITS.BLOCKS,
  },
}

describe('PaymentConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms and closes a direct send', async () => {
    const onConfirm = vi.fn<(values: SendFormValues) => Promise<void>>().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <PaymentConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        values={baseValues}
        meta={{ feeConfigValues, sourceJar }}
      />,
    )

    expect(screen.getByText('send.confirm_send_modal.text_collaborative_tx_disabled')).toBeInTheDocument()
    expect(screen.getByText('Source jar')).toBeInTheDocument()
    expect(screen.getByText(`address:${baseValues.destination.address}`)).toBeInTheDocument()
    expect(screen.getByText('balance:12000')).toBeInTheDocument()
    expect(
      screen.getByText('send.confirm_send_modal.text_miner_fee_in_targeted_blocks:{"count":6}'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'modal.confirm_button_reject' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'modal.confirm_button_accept' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(baseValues))
  })

  it('shows CoinJoin sweep fee details and debug payloads', () => {
    const values: SendFormValues = {
      ...baseValues,
      amount: {
        amount: undefined,
        isSweep: true,
        sweepAmount: 20_000,
        sweepUtxos: ['aaaa'.repeat(16) + ':0'],
      },
      destination: {
        address: baseValues.destination.address,
        fromJar: 1,
      },
      isCoinJoin: true,
      numCollaborators: 3,
    }

    render(
      <PaymentConfirmDialog
        debug
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        values={values}
        meta={{ destinationJar, feeConfigValues, sourceJar }}
      />,
    )

    expect(screen.getByText('send.confirm_send_modal.text_collaborative_tx_enabled')).toBeInTheDocument()
    expect(screen.getByText('Destination jar')).toBeInTheDocument()
    expect(screen.getByText(/send\.confirm_send_modal\.text_sweep_balance/u)).toBeInTheDocument()
    expect(screen.getAllByText('balance:20000')[0]).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('balance:1500')).toBeInTheDocument()
    expect(screen.getByText('(7.5%)')).toBeInTheDocument()
    expect(screen.getByText('dev-badge')).toBeInTheDocument()
    expect(screen.getByText(/"isCoinJoin": true/u)).toBeInTheDocument()
  })

  it('lists the utxos a sweep will spend', () => {
    const firstUtxoId = ('aaaa'.repeat(16) + ':0') as Utxo['utxo']
    const secondUtxoId = ('bbbb'.repeat(16) + ':1') as Utxo['utxo']
    const values: SendFormValues = {
      ...baseValues,
      amount: {
        amount: undefined,
        isSweep: true,
        sweepAmount: 33_000,
        sweepUtxos: [firstUtxoId, secondUtxoId],
      },
    }

    render(
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        values={values}
        meta={{
          feeConfigValues,
          sourceJar,
          availableUtxos: [
            makeUtxo({ utxo: firstUtxoId, address: 'bcrt1qfirst', value: 21_000 }),
            makeUtxo({ utxo: secondUtxoId, address: 'bcrt1qsecond', value: 12_000 }),
          ],
        }}
      />,
    )

    expect(screen.getByText('send.confirm_send_modal.label_utxos:{"count":2}')).toBeInTheDocument()
    expect(screen.getByText('address:bcrt1qfirst')).toBeInTheDocument()
    expect(screen.getByText('balance:21000')).toBeInTheDocument()
    expect(screen.getByText('address:bcrt1qsecond')).toBeInTheDocument()
    expect(screen.getByText('balance:12000')).toBeInTheDocument()
  })

  it('falls back to the raw utxo id when the jar entry is unknown', () => {
    const unknownUtxoId = ('cccc'.repeat(16) + ':2') as Utxo['utxo']
    const values: SendFormValues = {
      ...baseValues,
      amount: {
        amount: undefined,
        isSweep: true,
        sweepAmount: 5_000,
        sweepUtxos: [unknownUtxoId],
      },
    }

    render(
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        values={values}
        meta={{ feeConfigValues, sourceJar, availableUtxos: [] }}
      />,
    )

    expect(screen.getByText('send.confirm_send_modal.label_utxos:{"count":1}')).toBeInTheDocument()
    expect(screen.getByText(unknownUtxoId)).toBeInTheDocument()
  })

  it('does not list utxos for a non-sweep payment', () => {
    render(
      <PaymentConfirmDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        values={baseValues}
        meta={{ feeConfigValues, sourceJar }}
      />,
    )

    expect(screen.queryByText(/send\.confirm_send_modal\.label_utxos/u)).not.toBeInTheDocument()
  })
})
