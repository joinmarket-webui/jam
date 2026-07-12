import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BetaWarningDialog } from '@/components/layout/footer/BetaWarningDialog'
import { Button } from '@/components/ui/button'
import { APP_DISPLAY_VERSION } from '@/constants/jam'
import { parseSemanticVersion } from '@/lib/utils'

const meta: Meta<typeof BetaWarningDialog> = {
  title: 'Dialog/BetaWarningDialog',
  component: BetaWarningDialog,
  tags: ['autodocs'],
  render: (args) => {
    const [open, setOpen] = useState(args.defaultOpen || false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <BetaWarningDialog {...args} open={open} onOpenChange={() => setOpen(false)} />
      </>
    )
  },
}
export default meta

type Story = StoryObj<typeof BetaWarningDialog>

export const Default: Story = {
  args: {
    jamVersion: APP_DISPLAY_VERSION,
    joinmarketVersion: parseSemanticVersion('0.9.12'),
    backendName: 'joinmarket-clientserver',
  },
}

export const JoinmarketNg: Story = {
  args: {
    jamVersion: APP_DISPLAY_VERSION,
    joinmarketVersion: parseSemanticVersion('0.33.0'),
    backendName: 'joinmarket-ng',
  },
}

export const StandaloneJoinmarketNg: Story = {
  args: {
    jamVersion: APP_DISPLAY_VERSION,
    joinmarketVersion: parseSemanticVersion('0.33.0'),
    backendName: 'jam-standalone (joinmarket-ng)',
  },
}

export const UnknownBackendVersion: Story = {
  args: {
    jamVersion: APP_DISPLAY_VERSION,
  },
}
