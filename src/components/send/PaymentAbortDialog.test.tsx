import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { PaymentAbortDialog } from './PaymentAbortDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>Close</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

vi.mock('../ui/spinner', () => ({
  Spinner: () => <span data-testid="spinner">spinner</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span data-testid="balance">{valueString}</span>,
}))

vi.mock('@/components/ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span data-testid="address">{value}</span>,
}))

const mockJars: Jar[] = [
  {
    jarIndex: 0,
    name: 'Jar 0',
    color: '#e2b86a',
    balanceSummary: {
      calculatedTotalBalanceInSats: 1000000,
      calculatedAvailableBalanceInSats: 1000000,
      calculatedConfirmedAvailableBalanceInSats: 1000000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
  {
    jarIndex: 1,
    name: 'Jar 1',
    color: '#3b5ba9',
    balanceSummary: {
      calculatedTotalBalanceInSats: 500000,
      calculatedAvailableBalanceInSats: 500000,
      calculatedConfirmedAvailableBalanceInSats: 500000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
    utxos: [],
  },
]

describe('PaymentAbortDialog', () => {
  it('renders correctly', () => {
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isConfirming={false} />)

    expect(screen.getByText('send.confirm_abort_modal.title')).toBeInTheDocument()
    expect(screen.getByText('send.confirm_abort_modal.text_body')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeInTheDocument()
    expect(screen.getByText('global.abort')).toBeInTheDocument()
  })

  it('renders correctly when confirming', () => {
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isConfirming={true} />)

    // The button has a spinner and text when confirming
    expect(screen.getByText('global.abort')).toBeInTheDocument()
    expect(screen.getByText('modal.confirm_button_reject')).toBeDisabled()
  })

  it('calls onConfirm when abort button is clicked', () => {
    const onConfirm = vi.fn()
    render(<PaymentAbortDialog open={true} onOpenChange={vi.fn()} onConfirm={onConfirm} isConfirming={false} />)

    fireEvent.click(screen.getByText('global.abort'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange when reject button is clicked', () => {
    const onOpenChange = vi.fn()
    render(<PaymentAbortDialog open={true} onOpenChange={onOpenChange} onConfirm={vi.fn()} isConfirming={false} />)

    fireEvent.click(screen.getByText('modal.confirm_button_reject'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders payment details when paymentAttempt is provided', () => {
    const paymentAttempt: PaymentAttempt = {
      createdAt: 123456789,
      utxosHashHex: 'hash',
      walletFileName: 'wallet.jmdat',
      data: {
        source: { fromJar: 0 },
        destination: { fromJar: undefined, address: 'bc1qdestinationaddress' },
        amount: { isSweep: false, amount: 250000, sweepAmount: undefined, sweepUtxos: undefined },
        isCoinJoin: true,
        numCollaborators: 5,
        txFee: { txFeeUnit: 'blocks', txFeeInBlocks: 3 },
      },
    }

    render(
      <PaymentAbortDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isConfirming={false}
        paymentAttempt={paymentAttempt}
        jars={mockJars}
      />,
    )

    expect(screen.getByText('send.confirm_send_modal.label_source_jar')).toBeInTheDocument()
    expect(screen.getByText('Jar 0')).toBeInTheDocument()
    expect(screen.getByText('#0')).toBeInTheDocument()

    expect(screen.getByText('send.confirm_send_modal.label_amount')).toBeInTheDocument()
    expect(screen.getByTestId('balance')).toHaveTextContent('250000')

    expect(screen.getByText('send.confirm_send_modal.label_recipient')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('bc1qdestinationaddress')
  })

  it('renders internal transfer details with destination jar', () => {
    const paymentAttempt: PaymentAttempt = {
      createdAt: 123456789,
      utxosHashHex: 'hash',
      walletFileName: 'wallet.jmdat',
      data: {
        source: { fromJar: 0 },
        destination: { fromJar: 1, address: 'bc1qinternaladdress' },
        amount: { isSweep: false, amount: 150000, sweepAmount: undefined, sweepUtxos: undefined },
        isCoinJoin: true,
        numCollaborators: 4,
        txFee: { txFeeUnit: 'blocks', txFeeInBlocks: 3 },
      },
    }

    render(
      <PaymentAbortDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isConfirming={false}
        paymentAttempt={paymentAttempt}
        jars={mockJars}
      />,
    )

    expect(screen.getByText('Jar 0')).toBeInTheDocument()
    expect(screen.getByText('Jar 1')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('bc1qinternaladdress')
  })

  it('renders sweep badge when payment is a sweep', () => {
    const paymentAttempt: PaymentAttempt = {
      createdAt: 123456789,
      utxosHashHex: 'hash',
      walletFileName: 'wallet.jmdat',
      data: {
        source: { fromJar: 0 },
        destination: { fromJar: undefined, address: 'bc1qdestinationaddress' },
        amount: { isSweep: true, amount: undefined, sweepAmount: 1000000, sweepUtxos: [] },
        isCoinJoin: true,
        numCollaborators: 5,
        txFee: { txFeeUnit: 'blocks', txFeeInBlocks: 3 },
      },
    }

    render(
      <PaymentAbortDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isConfirming={false}
        paymentAttempt={paymentAttempt}
        jars={mockJars}
      />,
    )

    expect(screen.getByText('Sweep')).toBeInTheDocument()
    expect(screen.getByTestId('balance')).toHaveTextContent('1000000')
  })
})
