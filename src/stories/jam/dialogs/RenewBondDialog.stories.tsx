import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RenewBondDialog } from '@/components/earn/RenewBondDialog'
import { Button } from '@/components/ui/button'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'

const mockUtxo: FidelityBondUtxo = {
  utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0',
  address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  value: 5_000_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 144,
  frozen: true,
  locktime: '2027-01-01 00:00:00',
  path: "m/84'/1'/0'/0/0",
  label: 'Fidelity Bond #1',
}

const meta: Meta<typeof RenewBondDialog> = {
  title: 'Dialog/RenewBondDialog',
  component: RenewBondDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <RenewBondDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof RenewBondDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    utxo: mockUtxo,
  },
}
