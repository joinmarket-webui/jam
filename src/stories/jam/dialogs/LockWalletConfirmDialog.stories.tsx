import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { LockWalletConfirmDialog } from '@/components/ui/jam/LockWalletConfirmDialog'

const meta: Meta<typeof LockWalletConfirmDialog> = {
  title: 'Dialog/LockWalletConfirmDialog',
  component: LockWalletConfirmDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <LockWalletConfirmDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof LockWalletConfirmDialog>

export const Default: Story = {
  args: {
    coinjoinInProgress: false,
    makerRunning: false,
    isLocking: false,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}

export const MakerRunning: Story = {
  args: {
    coinjoinInProgress: false,
    makerRunning: true,
    isLocking: false,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}

export const CoinjoinInProgress: Story = {
  args: {
    coinjoinInProgress: true,
    makerRunning: false,
    isLocking: false,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}

export const Locking: Story = {
  args: {
    coinjoinInProgress: true,
    makerRunning: false,
    isLocking: true,
    onConfirm: async () => alert('Confirm clicked!'),
  },
}
