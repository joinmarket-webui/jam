import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaymentAbortDialog } from '@/components/send/PaymentAbortDialog'
import { Button } from '@/components/ui/button'
import type { PaymentAttempt } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'

const mockJars: Jar[] = [
  {
    jarIndex: 0,
    name: 'Jar 0',
    utxos: [],
    totalBalance: 1000000,
    availableBalance: 1000000,
    frozenBalance: 0,
    account: 0,
  },
  {
    jarIndex: 1,
    name: 'Jar 1',
    utxos: [],
    totalBalance: 500000,
    availableBalance: 500000,
    frozenBalance: 0,
    account: 1,
  },
]

const samplePaymentAttempt: PaymentAttempt = {
  createdAt: 123456789,
  utxosHashHex: 'hash',
  walletFileName: 'wallet.jmdat',
  data: {
    source: { fromJar: 0 },
    destination: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
    amount: { isSweep: false, amount: 250000 },
    isCoinJoin: true,
    numCollaborators: 5,
    txFee: { txFeeUnit: 'blocks', txFeeInBlocks: 3 },
  },
}

const meta: Meta<typeof PaymentAbortDialog> = {
  title: 'Dialog/PaymentAbortDialog',
  component: PaymentAbortDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <PaymentAbortDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof PaymentAbortDialog>

export const Default: Story = {
  args: {
    isConfirming: false,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}

export const Confirming: Story = {
  args: {
    isConfirming: true,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}

export const WithPaymentDetails: Story = {
  args: {
    isConfirming: false,
    onConfirm: async () => alert('Confirm clicked!'),
    paymentAttempt: samplePaymentAttempt,
    jars: mockJars,
  },
}

export const WithInternalTransfer: Story = {
  args: {
    isConfirming: false,
    onConfirm: async () => alert('Confirm clicked!'),
    paymentAttempt: {
      ...samplePaymentAttempt,
      data: {
        ...samplePaymentAttempt.data,
        destination: { fromJar: 1, address: 'bc1qc7slrfxkvy5l643lydnw9re59gtzzwf5mdqxyz' },
      },
    },
    jars: mockJars,
  },
}

export const WithSweep: Story = {
  args: {
    isConfirming: false,
    onConfirm: async () => alert('Confirm clicked!'),
    paymentAttempt: {
      ...samplePaymentAttempt,
      data: {
        ...samplePaymentAttempt.data,
        amount: { isSweep: true, sweepAmount: 1000000, sweepUtxos: [] },
      },
    },
    jars: mockJars,
  },
}
