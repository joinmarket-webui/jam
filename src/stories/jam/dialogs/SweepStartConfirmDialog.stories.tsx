import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SweepStartConfirmDialog } from '@/components/sweep/SweepStartConfirmDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof SweepStartConfirmDialog> = {
  title: 'Dialog/SweepStartConfirmDialog',
  component: SweepStartConfirmDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <SweepStartConfirmDialog
          {...args}
          open={open}
          onOpenChange={setOpen}
          onConfirm={async () => {
            alert('Confirmed sweep start')
            setOpen(false)
          }}
        />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof SweepStartConfirmDialog>

export const Default: Story = {
  args: {
    disabled: false,
    isStarting: false,
  },
}

export const Starting: Story = {
  args: {
    disabled: true,
    isStarting: true,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    isStarting: false,
  },
}

export const WithScheduleSummary: Story = {
  args: {
    disabled: false,
    isStarting: false,
    totalBalanceInSats: 2500000,
    totalActions: 3,
    destinationAddresses: ['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'bc1qc7slrfxkvy5l643lydnw9re59gtzzwf5mdqxyz'],
  },
}
