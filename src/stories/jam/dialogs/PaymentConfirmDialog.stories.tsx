import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import PaymentConfirmDialog from '@/components/send/PaymentConfirmDialog'
import { Button } from '@/components/ui/button'
import type { Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS, toJamFeeConfigValues } from '@/lib/feeConfig'

const sourceJar: Jar = {
  jarIndex: 0,
  name: 'Apricot',
  color: 'yellow',
  balanceSummary: {
    accountIndex: 0,
    calculatedTotalBalanceInSats: 2500000,
    calculatedAvailableBalanceInSats: 2000000,
    calculatedFrozenOrLockedBalanceInSats: 500000,
  },
  utxos: [],
}

const destinationJar: Jar = {
  jarIndex: 1,
  name: 'Blueberry',
  color: 'blue',
  balanceSummary: {
    accountIndex: 1,
    calculatedTotalBalanceInSats: 1000000,
    calculatedAvailableBalanceInSats: 1000000,
    calculatedFrozenOrLockedBalanceInSats: 0,
  },
  utxos: [],
}

const feeConfigValues = toJamFeeConfigValues({
  max_cj_fee_abs: '1500',
  max_cj_fee_rel: '0.00025',
  tx_fees: '3',
  tx_fees_factor: '0.2',
  max_sweep_fee_change: '0.8',
})

const meta: Meta<typeof PaymentConfirmDialog> = {
  title: 'Dialog/PaymentConfirmDialog',
  component: PaymentConfirmDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <PaymentConfirmDialog
          {...args}
          open={open}
          onOpenChange={setOpen}
          onConfirm={async (values) => {
            alert(`Confirmed send of ${values.amount.amount ?? values.amount.sweepAmount} sats`)
            setOpen(false)
          }}
        />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof PaymentConfirmDialog>

export const CollaborativeSend: Story = {
  args: {
    values: {
      source: { fromJar: 0 },
      destination: {
        address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        fromJar: undefined,
      },
      amount: {
        isSweep: false,
        amount: 500_000,
        sweepAmount: undefined,
        sweepUtxos: undefined,
      },
      isCoinJoin: true,
      numCollaborators: 8,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 3,
        txFeeInSatsPerVbyte: undefined,
      },
    },
    meta: {
      feeConfigValues,
      sourceJar,
    },
  },
}

export const DirectSend: Story = {
  args: {
    values: {
      source: { fromJar: 0 },
      destination: {
        address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        fromJar: undefined,
      },
      amount: {
        isSweep: false,
        amount: 300_000,
        sweepAmount: undefined,
        sweepUtxos: undefined,
      },
      isCoinJoin: false,
      numCollaborators: undefined,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 6,
        txFeeInSatsPerVbyte: undefined,
      },
    },
    meta: {
      feeConfigValues,
      sourceJar,
    },
  },
}

export const InternalJarTransfer: Story = {
  args: {
    values: {
      source: { fromJar: 0 },
      destination: {
        address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
        fromJar: 1,
      },
      amount: {
        isSweep: false,
        amount: 250_000,
        sweepAmount: undefined,
        sweepUtxos: undefined,
      },
      isCoinJoin: true,
      numCollaborators: 8,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 3,
        txFeeInSatsPerVbyte: undefined,
      },
    },
    meta: {
      feeConfigValues,
      sourceJar,
      destinationJar,
    },
  },
}

export const Sweep: Story = {
  args: {
    values: {
      source: { fromJar: 0 },
      destination: {
        address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        fromJar: undefined,
      },
      amount: {
        isSweep: true,
        amount: undefined,
        sweepAmount: 2_000_000,
        sweepUtxos: ['4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0'],
      },
      isCoinJoin: true,
      numCollaborators: 9,
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 3,
        txFeeInSatsPerVbyte: undefined,
      },
    },
    meta: {
      feeConfigValues,
      sourceJar,
      availableUtxos: [
        {
          utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0',
          address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          value: 2000000,
          tries: 0,
          tries_remaining: 3,
          external: false,
          mixdepth: 0,
          confirmations: 12,
          frozen: false,
          locktime: undefined,
          path: "m/84'/1'/0'/0/0",
          label: '',
        },
      ],
    },
  },
}
