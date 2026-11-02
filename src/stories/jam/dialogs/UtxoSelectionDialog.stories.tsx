import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { RowSelectionState } from '@tanstack/react-table'
import { UtxoSelectionDialog } from '@/components/send/UtxoSelectionDialog'
import { Button } from '@/components/ui/button'
import type { UtxoTableEntry } from '@/components/wallet/JarUtxosTable.schema'

const mockUtxos: UtxoTableEntry[] = [
  {
    utxo: {
      utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0',
      address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      value: 1250000,
      tries: 0,
      tries_remaining: 3,
      external: false,
      mixdepth: 0,
      confirmations: 12,
      frozen: false,
      locktime: undefined,
      path: "m/84'/1'/0'/0/0",
      label: 'Mining payout',
    },
    tags: [],
  },
  {
    utxo: {
      utxo: '8f2b3e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda11c:1',
      address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      value: 750000,
      tries: 0,
      tries_remaining: 3,
      external: false,
      mixdepth: 0,
      confirmations: 3,
      frozen: false,
      locktime: undefined,
      path: "m/84'/1'/0'/0/1",
      label: 'Deposit',
    },
    tags: [],
  },
  {
    utxo: {
      utxo: '1c4e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda99a:0',
      address: 'bcrt1q9h02s4859pkyvywhs302q89x742eumzn5u4dca',
      value: 500000,
      tries: 0,
      tries_remaining: 0,
      external: false,
      mixdepth: 0,
      confirmations: 144,
      frozen: true,
      locktime: undefined,
      path: "m/84'/1'/0'/0/2",
      label: 'Cold storage',
    },
    tags: [],
  },
]

const meta: Meta<typeof UtxoSelectionDialog> = {
  title: 'Dialog/UtxoSelectionDialog',
  component: UtxoSelectionDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    const [filter, setFilter] = useState(args.filter ?? '')
    const [rowSelection, setRowSelection] = useState<RowSelectionState>(args.initialRowSelection ?? {})

    const selectedCount = Object.values(rowSelection).filter(Boolean).length

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <UtxoSelectionDialog
          {...args}
          open={open}
          filter={filter}
          selectedCount={selectedCount}
          initialRowSelection={rowSelection}
          enableRowSelection={true}
          onOpenChange={setOpen}
          onFilterChange={setFilter}
          onRowSelectionChange={setRowSelection}
          onSubmit={async () => {
            alert(`Submitted with ${selectedCount} UTXOs selected`)
            setOpen(false)
          }}
        />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof UtxoSelectionDialog>

export const Default: Story = {
  args: {
    tableEntries: mockUtxos,
    initialRowSelection: { '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0': true },
    filter: '',
    isSubmitting: false,
  },
}

export const Empty: Story = {
  args: {
    tableEntries: [],
    initialRowSelection: {},
    filter: '',
    isSubmitting: false,
  },
}

export const Submitting: Story = {
  args: {
    tableEntries: mockUtxos,
    initialRowSelection: { '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0': true },
    filter: '',
    isSubmitting: true,
  },
}
