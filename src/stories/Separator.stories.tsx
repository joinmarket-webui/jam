import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator } from '../components/ui/separator'

const meta: Meta<typeof Separator> = {
  title: 'Core/Separator',
  component: Separator,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
}

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    style: { height: 100 },
  },
}
