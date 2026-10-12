import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { http, HttpResponse } from 'msw'
import { SeedPhraseDialog } from '@/components/settings/SeedPhraseDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof SeedPhraseDialog> = {
  title: 'Dialog/SeedPhraseDialog',
  component: SeedPhraseDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <SeedPhraseDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof SeedPhraseDialog>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    hashedPassword: /* hash("test") := */ 'da41454ecc40c48499decbca7b1df4595f0a856caada3f182d47293fbad03004',
    autoCloseTimeout: 60_000,
  },
}

export const FetchError: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    hashedPassword: /* hash("test") := */ 'da41454ecc40c48499decbca7b1df4595f0a856caada3f182d47293fbad03004',
    autoCloseTimeout: 60_000,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/wallet/:walletFileName/getseed', () => {
          return HttpResponse.json(
            {
              message: 'Failed to retrieve seed phrase from wallet daemon.',
            },
            { status: 500 },
          )
        }),
      ],
    },
  },
}
