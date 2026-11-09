import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { CreateFidelityBondDialog } from '@/components/earn/CreateFidelityBondDialog'
import { Button } from '@/components/ui/button'
import type { Utxo } from '@/hooks/useQueryUtxos'

const mockUtxo1: Utxo = {
  utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:0',
  address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  value: 5_000_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 144,
  frozen: false,
  locktime: undefined,
  path: "m/84'/1'/0'/0/0",
  label: '',
}

const mockUtxo2: Utxo = {
  utxo: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b:1',
  address: 'bcrt1qab2kgdygjrsqtzq2n0yrf2493p83kkfjhx0abc',
  value: 2_500_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 144,
  frozen: false,
  locktime: undefined,
  path: "m/84'/1'/0'/0/1",
  label: '',
}

const mockUtxo3: Utxo = {
  utxo: '9b5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda999:0',
  address: 'bcrt1qcd2kgdygjrsqtzq2n0yrf2493p83kkfjhx0xyz',
  value: 10_000_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 1,
  confirmations: 144,
  frozen: false,
  locktime: undefined,
  path: "m/84'/1'/1'/0/0",
  label: '',
}

const mockWalletDisplay = {
  walletinfo: {
    wallet_name: 'Satoshi.jmdat',
    total_balance: '17500000',
    accounts: [
      {
        account: '0',
        account_balance: '7500000',
        branches: [
          {
            branch: '0/0',
            balance: '7500000',
            entries: [
              {
                address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                amount: '5000000',
                status: 'cj-out',
                ext_info: "m/84'/1'/0'/0/0",
              },
              {
                address: 'bcrt1qab2kgdygjrsqtzq2n0yrf2493p83kkfjhx0abc',
                amount: '2500000',
                status: 're-deposit',
                ext_info: "m/84'/1'/0'/0/1",
              },
            ],
          },
        ],
      },
      {
        account: '1',
        account_balance: '10000000',
        branches: [
          {
            branch: '1/0',
            balance: '10000000',
            entries: [
              {
                address: 'bcrt1qcd2kgdygjrsqtzq2n0yrf2493p83kkfjhx0xyz',
                amount: '10000000',
                status: 'cj-out',
                ext_info: "m/84'/1'/1'/0/0",
              },
            ],
          },
        ],
      },
    ],
  },
}

const defaultHandlers = [
  http.get('/api/v1/session', () => {
    return HttpResponse.json({ session: true })
  }),
  http.get('/api/v1/wallet/:walletFileName/display', () => {
    return HttpResponse.json(mockWalletDisplay)
  }),
  http.get('/api/v1/wallet/:walletFileName/utxos', () => {
    return HttpResponse.json({
      utxos: [mockUtxo1, mockUtxo2, mockUtxo3],
    })
  }),
  http.get('/api/v1/wallet/:walletFileName/address/timelock/new/:lockdate', () => {
    return HttpResponse.json({
      address: 'bcrt1qtimelockaddress000000000000000000000000000',
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

const meta: Meta<typeof CreateFidelityBondDialog> = {
  title: 'Dialog/CreateFidelityBondDialog',
  component: CreateFidelityBondDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <CreateFidelityBondDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof CreateFidelityBondDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
}

export const SingleJar: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/wallet/:walletFileName/display', () => {
          return HttpResponse.json({
            walletinfo: {
              wallet_name: 'Satoshi.jmdat',
              total_balance: '7500000',
              accounts: [
                {
                  account: '0',
                  account_balance: '7500000',
                  branches: [
                    {
                      branch: '0/0',
                      balance: '7500000',
                      entries: [
                        {
                          address: 'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                          amount: '5000000',
                          status: 'cj-out',
                          ext_info: "m/84'/1'/0'/0/0",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          })
        }),
        http.get('/api/v1/wallet/:walletFileName/utxos', () => {
          return HttpResponse.json({
            utxos: [mockUtxo1],
          })
        }),
        ...defaultHandlers,
      ],
    },
  },
}

export const NoEligibleUtxos: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/wallet/:walletFileName/display', () => {
          return HttpResponse.json({
            walletinfo: {
              wallet_name: 'Satoshi.jmdat',
              total_balance: '2500000',
              accounts: [
                {
                  account: '0',
                  account_balance: '2500000',
                  branches: [
                    {
                      branch: '0/0',
                      balance: '2500000',
                      entries: [
                        {
                          address: 'bcrt1qab2kgdygjrsqtzq2n0yrf2493p83kkfjhx0abc',
                          amount: '2500000',
                          status: 're-deposit',
                          ext_info: "m/84'/1'/0'/0/1",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          })
        }),
        http.get('/api/v1/wallet/:walletFileName/utxos', () => {
          return HttpResponse.json({
            utxos: [mockUtxo2],
          })
        }),
        ...defaultHandlers,
      ],
    },
  },
}

export const CreateError: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/wallet/:walletFileName/taker/direct-send', () => {
          return HttpResponse.json(
            {
              message: 'Failed to broadcast transaction.',
            },
            { status: 500 },
          )
        }),
        ...defaultHandlers,
      ],
    },
  },
}
