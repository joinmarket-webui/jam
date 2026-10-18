import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import QrScannerDialog from '@/components/ui/QrScannerDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof QrScannerDialog> = {
  title: 'Dialog/QrScannerDialog',
  component: QrScannerDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <QrScannerDialog
          {...args}
          open={open}
          onOpenChange={setOpen}
          onScan={(result) => {
            alert(`Scanned: ${result.address}`)
            setOpen(false)
          }}
        />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof QrScannerDialog>

export const Default: Story = {
  args: {},
}
