import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaymentAbortDialog } from '@/components/send/PaymentAbortDialog'
import { Button } from '@/components/ui/button'

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
