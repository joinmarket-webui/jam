import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { SignMessageDialog } from '@/components/settings/SignMessageDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof SignMessageDialog> = {
  title: 'Dialog/SignMessageDialog',
  component: SignMessageDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <SignMessageDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof SignMessageDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
}

export const SuccessfulSignature: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/wallet/:walletFileName/signmessage', () => {
          return HttpResponse.json({
            signature: 'H/D59BDBDmHpRWhgahNzSG5/mMQjR1Z+p33N3qO37F15S9u7zQ/gZfXm15kXN98oZ/Z3lK9gL8n7f6x4w3v2u1=',
          })
        }),
      ],
    },
  },
}

export const SigningError: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
  },
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/wallet/:walletFileName/signmessage', () => {
          return HttpResponse.json(
            {
              message: 'Private key for this address is not available or path is invalid.',
            },
            { status: 500 },
          )
        }),
      ],
    },
  },
}
