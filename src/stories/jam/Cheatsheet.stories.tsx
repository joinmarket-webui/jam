import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Cheatsheet } from '@/components/ui/jam/Cheatsheet'

const meta: Meta<typeof Cheatsheet> = {
  title: 'Jam/Cheatsheet',
  component: Cheatsheet,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}
export default meta

type Story = StoryObj<typeof Cheatsheet>

const OpenCheatsheetStory = () => {
  const [open, setOpen] = useState(true)

  return <Cheatsheet open={open} onOpenChange={setOpen} />
}

export const Open: Story = {
  render: () => <OpenCheatsheetStory />,
}

export const Closed: Story = {
  args: {
    open: false,
    onOpenChange: () => undefined,
  },
}
