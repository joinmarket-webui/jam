import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { Cheatsheet } from '@/components/ui/jam/Cheatsheet'

const meta: Meta<typeof Cheatsheet> = {
  title: 'Jam/Cheatsheet',
  component: Cheatsheet,
  tags: ['autodocs'],
  parameters: {},
}
export default meta

type Story = StoryObj<typeof Cheatsheet>

const OpenCheatsheetStory = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className="h-screen">
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Cheatsheet open={open} onOpenChange={setOpen} />
    </div>
  )
}

export const Open: Story = {
  render: () => <OpenCheatsheetStory />,
}
