import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActiveCollaborativeSendAlert } from '@/components/send/ActiveCollaborativeSendAlert'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
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

export const Default: Story = {
  args: {},
}

const paymentAttempt: PaymentAttempt = {
  createdAt: 1_000,
  utxosHashHex: 'abc123hash',
  walletFileName: 'Satoshi.jmdat',
  data: {
    amount: { amount: 25_000, isSweep: false as const, sweepAmount: undefined },
    destination: { address: 'bcrt1qdestinationaddress123456789', fromJar: undefined },
    isCoinJoin: true,
    numCollaborators: 5,
    source: { fromJar: 0 as const },
    txFee: { txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined, txFeeUnit: TX_FEE_UNITS.BLOCKS },
  },
}

export const WithPaymentAttempt: Story = {
  args: {
    paymentAttempt,
  },
}
