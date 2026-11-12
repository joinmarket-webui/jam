import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SweepStopConfirmDialog } from '@/components/sweep/SweepStopConfirmDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof SweepStopConfirmDialog> = {
  title: 'Dialog/SweepStopConfirmDialog',
  component: SweepStopConfirmDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <SweepStopConfirmDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof SweepStopConfirmDialog>

export const Default: Story = {
  args: {
    isStopping: false,
    onConfirm: async () => alert('Confirm stop clicked!'),
  },
}

export const Stopping: Story = {
  args: {
    isStopping: true,
    onConfirm: async () => alert('Confirm stop clicked!'),
  },
}
