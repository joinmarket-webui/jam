import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TakerStatusCard } from '@/components/send/TakerStatusCard'
import type { PaymentAttempt, TakerInfo } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { toTakerStatusInfo } from '@/lib/takerStatus'

const meta: Meta<typeof TakerStatusCard> = {
  title: 'Jam/TakerStatusCard',
  component: TakerStatusCard,
  tags: ['autodocs'],
  args: {
    jars: [],
    isAborting: false,
    onAbort: () => alert('onAbort clicked'),
  },
}
export default meta

type Story = StoryObj<typeof TakerStatusCard>

const statusFetchingOrderbook = toTakerStatusInfo({ running: true, status: 'fetching_orderbook' })

const rawFailed: TakerStatusResponse = {
  running: false,
  status: 'failed',
  error: 'Not enough counterparties responded to fill the order.',
}

const rawCancelled: TakerStatusResponse = { running: false, status: 'cancelled' }

const rawCompleted: TakerStatusResponse = {
  running: false,
  status: 'complete',
  txid: 'ab'.repeat(32),
  broadcast_method: 'self',
}

const rawCompletedUnverified: TakerStatusResponse = {
  ...rawCompleted,
  broadcast_method: 'makers-unverified:random-peer',
}

const takerInfo: TakerInfo = {
  running: true,
  status: statusFetchingOrderbook,
  scheduler: {
    running: false,
  },
}

const jars: Jar[] = [
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
]

export const Default: Story = {
  args: {
    takerInfo,
  },
}

const paymentAttempt: PaymentAttempt = {
  createdAt: 1_000,
  utxosHashHex: 'abc123hash',
  walletFileName: 'Satoshi.jmdat',
  data: {
    amount: { amount: 21_000, isSweep: false as const, sweepAmount: undefined, sweepUtxos: undefined },
    destination: { address: 'bcrt1qdestinationaddress123456789', fromJar: undefined },
    isCoinJoin: true,
    numCollaborators: 5,
    source: { fromJar: 0 as const },
    txFee: { txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined, txFeeUnit: TX_FEE_UNITS.BLOCKS },
  },
}

const takerInfoWithPaymentAttempt: TakerInfo = {
  ...takerInfo,
  currentPaymentAttempt: paymentAttempt,
}

export const WithPaymentAttempt: Story = {
  args: {
    takerInfo: takerInfoWithPaymentAttempt,
    jars,
  },
}

export const WithSweepPaymentAttempt: Story = {
  args: {
    takerInfo: {
      ...takerInfoWithPaymentAttempt,
      currentPaymentAttempt: {
        ...takerInfoWithPaymentAttempt.currentPaymentAttempt!,
        data: {
          ...takerInfoWithPaymentAttempt.currentPaymentAttempt!.data,
          amount: { amount: undefined, isSweep: true, sweepAmount: 21_000, sweepUtxos: ['aaaa'.repeat(16) + ':0'] },
          destination: {
            address: 'bcrt1qdestinationaddress123456789',
            fromJar: takerInfoWithPaymentAttempt.currentPaymentAttempt!.data.source.fromJar,
          },
        },
      },
    },
    jars,
  },
}

const endedTakerInfo = (raw?: TakerStatusResponse): TakerInfo => ({
  ...takerInfoWithPaymentAttempt,
  running: false,
  status: toTakerStatusInfo(raw),
  __raw: raw,
})

export const Failed: Story = {
  args: {
    takerInfo: endedTakerInfo(rawFailed),
    jars,
    onAbort: undefined,
    onDone: () => alert('onDone clicked'),
  },
}

export const Completed: Story = {
  args: {
    takerInfo: endedTakerInfo(rawCompleted),
    jars,
    onAbort: undefined,
    onDone: () => alert('onDone clicked'),
  },
}

export const CompletedUnverified: Story = {
  args: {
    takerInfo: endedTakerInfo(rawCompletedUnverified),
    jars,
    onAbort: undefined,
    onDone: () => alert('onDone clicked'),
  },
}

export const Cancelled: Story = {
  args: {
    takerInfo: endedTakerInfo(rawCancelled),
    jars,
    onAbort: undefined,
    onDone: () => alert('onDone clicked'),
  },
}

export const EndedWithUnknownOutcome: Story = {
  args: {
    takerInfo: endedTakerInfo(undefined),
    jars,
    onAbort: undefined,
    onDone: () => alert('onDone clicked'),
  },
}
