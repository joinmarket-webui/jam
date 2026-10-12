import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActiveCollaborativeSendAlert } from '@/components/send/ActiveCollaborativeSendAlert'
import type { PaymentAttempt, TakerInfo } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS } from '@/lib/feeConfig'

const meta: Meta<typeof ActiveCollaborativeSendAlert> = {
  title: 'Jam/ActiveCollaborativeSendAlert',
  component: ActiveCollaborativeSendAlert,
  tags: ['autodocs'],
  args: {
    jars: [],
    isAborting: false,
    onAbort: () => alert('onAbort clicked'),
  },
}
export default meta

type Story = StoryObj<typeof ActiveCollaborativeSendAlert>

const statusUnknown: TakerInfo['status'] = {
  value: null,
  idle: false,
  fetchingOrderbook: false,
  filling: false,
  authenticating: false,
  collectingSignatures: false,
  broadcasting: false,
  completed: false,
  failed: false,
  cancelled: false,
}

const statusFetchingOrderbook: TakerInfo['status'] = {
  ...statusUnknown,
  value: 'fetching_orderbook',
  fetchingOrderbook: true,
}

const statusFailed: TakerInfo['status'] = {
  ...statusUnknown,
  value: 'failed',
  failed: true,
}

const statusCancelled: TakerInfo['status'] = {
  ...statusUnknown,
  value: 'cancelled',
  cancelled: true,
}

const statusCompleted: TakerInfo['status'] = {
  ...statusUnknown,
  value: 'completed',
  completed: true,
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

export const Failed: Story = {
  args: {
    takerInfo: {
      ...takerInfoWithPaymentAttempt,
      status: statusFailed,
      running: false,
    },
    jars,
  },
}

export const Completed: Story = {
  args: {
    takerInfo: {
      ...takerInfoWithPaymentAttempt,
      status: statusCompleted,
      running: false,
    },
    jars,
  },
}

export const Cancelled: Story = {
  args: {
    takerInfo: {
      ...takerInfoWithPaymentAttempt,
      status: statusCancelled,
      running: false,
    },
    jars,
  },
}
