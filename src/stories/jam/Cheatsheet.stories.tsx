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

export const Open: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
  },
}

export const Closed: Story = {
  args: {
    ...Open.args,
    open: false,
  },
}
