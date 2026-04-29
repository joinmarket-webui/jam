import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeeConfigDialog } from '@/components/settings/fees/FeeConfigDialog'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

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
  },
}
