import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { ActiveCollaborativeSendAlert } from './ActiveCollaborativeSendAlert'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
  Trans: ({ i18nKey, children }: { i18nKey: string; children?: React.ReactNode }) => <span>{i18nKey || children}</span>,
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({ addressChunkingEnabled: false }),
}))

const sampleJars: Jar[] = [
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 100_000,
      calculatedConfirmedAvailableBalanceInSats: 100_000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedTotalBalanceInSats: 100_000,
    },
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Jar Zero',
    utxos: [],
  },
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 50_000,
      calculatedConfirmedAvailableBalanceInSats: 50_000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedTotalBalanceInSats: 50_000,
    },
    color: '#3b5ba9',
    jarIndex: 1,
    name: 'Jar One',
    utxos: [],
  },
]

const sampleAttempt: PaymentAttempt = {
  createdAt: 1000,
  utxosHashHex: 'abc123hash',
  walletFileName: 'testwallet.jmdat',
  data: {
    amount: { amount: 25_000, isSweep: false as const, sweepAmount: undefined },
    destination: { address: 'bc1qdestinationaddress123456789', fromJar: undefined },
    isCoinJoin: true,
    numCollaborators: 5,
    source: { fromJar: 0 as const },
    txFee: { txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined, txFeeUnit: TX_FEE_UNITS.BLOCKS },
  },
}

describe('ActiveCollaborativeSendAlert', () => {
  it('renders title and details for active collaborative send to external address', () => {
    render(
      <ActiveCollaborativeSendAlert
        paymentAttempt={sampleAttempt}
        jars={sampleJars}
        isWaitingCoinjoinStop={false}
        schedulerRunning={false}
        onAbort={vi.fn()}
      />,
    )

    expect(screen.getByText('send.text_coinjoin_already_running')).toBeInTheDocument()
    expect(screen.getByText('Jar Zero')).toBeInTheDocument()
    expect(screen.getByText('#0')).toBeInTheDocument()
    expect(screen.getByText(/bc1qdestinationaddress123456789/u)).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'global.abort' })).toBeInTheDocument()
  })

  it('renders destination jar badge when destination jar is present', () => {
    const internalAttempt = {
      ...sampleAttempt,
      data: {
        ...sampleAttempt.data,
        destination: { address: 'bc1qinternal', fromJar: 1 as const },
      },
    }

    render(
      <ActiveCollaborativeSendAlert
        paymentAttempt={internalAttempt}
        jars={sampleJars}
        isWaitingCoinjoinStop={false}
        schedulerRunning={false}
        onAbort={vi.fn()}
      />,
    )

    expect(screen.getByText('Jar One')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('calls onAbort when abort button is clicked', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()

    render(
      <ActiveCollaborativeSendAlert
        paymentAttempt={sampleAttempt}
        jars={sampleJars}
        isWaitingCoinjoinStop={false}
        schedulerRunning={false}
        onAbort={onAbort}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'global.abort' }))
    expect(onAbort).toHaveBeenCalledTimes(1)
  })

  it('hides abort button when scheduler is running', () => {
    render(
      <ActiveCollaborativeSendAlert
        paymentAttempt={sampleAttempt}
        jars={sampleJars}
        isWaitingCoinjoinStop={false}
        schedulerRunning={true}
        onAbort={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'global.abort' })).not.toBeInTheDocument()
  })

  it('disables abort button when stopping coinjoin', () => {
    render(
      <ActiveCollaborativeSendAlert
        paymentAttempt={sampleAttempt}
        jars={sampleJars}
        isWaitingCoinjoinStop={true}
        schedulerRunning={false}
        onAbort={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'global.abort' })).toBeDisabled()
  })
})
