import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { MoveToJarDialog } from '@/components/earn/MoveToJarDialog'
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

const defaultHandlers = [
  http.get('/api/v1/session', () => {
    return HttpResponse.json({ session: true })
  }),
  http.get('/api/v1/wallet/:walletFileName/display', () => {
    return HttpResponse.json({
      walletinfo: {
        wallet_name: 'Satoshi.jmdat',
        total_balance: '5000000',
        accounts: [],
      },
    })
  }),
  http.get('/api/v1/wallet/:walletFileName/utxos', () => {
    return HttpResponse.json({
      utxos: [mockUtxo],
    })
  }),
  http.get('/api/v1/wallet/:walletFileName/address/new/:mixdepth', () => {
    return HttpResponse.json({
      address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    })
  }),
  http.post('/api/v1/wallet/:walletFileName/freeze', () => {
    return HttpResponse.json({})
  }),
  http.post('/api/v1/wallet/:walletFileName/taker/direct-send', () => {
    return HttpResponse.json({
      txinfo: {
        txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        hex: '',
      },
    })
  }),
]

const meta: Meta<typeof MoveToJarDialog> = {
  title: 'Dialog/MoveToJarDialog',
  component: MoveToJarDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <MoveToJarDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof MoveToJarDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    utxo: mockUtxo,
  },
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
}

export const MoveError: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    utxo: mockUtxo,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/session', () => {
          return HttpResponse.json({ session: true })
        }),
        http.get('/api/v1/wallet/:walletFileName/display', () => {
          return HttpResponse.json({
            walletinfo: {
              wallet_name: 'Satoshi.jmdat',
              total_balance: '5000000',
              accounts: [],
            },
          })
        }),
        http.get('/api/v1/wallet/:walletFileName/utxos', () => {
          return HttpResponse.json({
            utxos: [mockUtxo],
          })
        }),
        http.get('/api/v1/wallet/:walletFileName/address/new/:mixdepth', () => {
          return HttpResponse.json({
            address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          })
        }),
        http.post('/api/v1/wallet/:walletFileName/freeze', () => {
          return HttpResponse.json({})
        }),
        http.post('/api/v1/wallet/:walletFileName/taker/direct-send', () => {
          return HttpResponse.json(
            {
              message: 'Failed to broadcast transaction.',
            },
            { status: 500 },
          )
        }),
      ],
    },
  },
}
