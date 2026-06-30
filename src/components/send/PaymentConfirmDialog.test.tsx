import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import PaymentConfirmDialog from './PaymentConfirmDialog'
import type { SendFormValues } from './types'

vi.mock('@radix-ui/react-dialog', () => ({
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

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

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>address:{value}</span>,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>balance:{valueString}</span>,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <span>spinner</span>,
}))

vi.mock('../ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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

const baseValues: SendFormValues = {
  amount: {
    amount: 12_000,
    isSweep: false,
    sweepAmount: undefined,
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
})
