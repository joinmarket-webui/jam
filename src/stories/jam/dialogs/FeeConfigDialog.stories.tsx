import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { toJamFeeConfigValues } from '@/lib/feeConfig'

const meta: Meta<typeof FeeConfigDialog> = {
  title: 'Dialog/FeeConfigDialog',
  component: FeeConfigDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Toaster closeButton />
        <Button onClick={() => setOpen(true)}>Open</Button>
        <FeeConfigDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof FeeConfigDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    feeConfigValidation: {
      feeConfigValues: toJamFeeConfigValues({
        max_cj_fee_abs: '1500',
        max_cj_fee_rel: '0.00025',
        tx_fees: '3',
        tx_fees_factor: '0.2',
        max_sweep_fee_change: '0.8',
      }),
      jmRawFeeConfigValues: {},
      maxFeesConfigMissing: false,
      isLoading: false,
      refetchAll: async () => [],
      fetchMissing: async () => [],
    },
  },
}

export const Empty: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    feeConfigValidation: {
      feeConfigValues: toJamFeeConfigValues({}),
      jmRawFeeConfigValues: {},
      maxFeesConfigMissing: false,
      isLoading: false,
      refetchAll: async () => [],
      fetchMissing: async () => [],
    },
  },
}

export const Loading: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    feeConfigValidation: {
      feeConfigValues: toJamFeeConfigValues({}),
      jmRawFeeConfigValues: {},
      maxFeesConfigMissing: false,
      isLoading: true,
      refetchAll: async () => [],
      fetchMissing: async () => [],
    },
  },
}
