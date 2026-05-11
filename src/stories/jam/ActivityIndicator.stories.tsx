import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActivityIndicator, WithActivityIndicator } from '@/components/ui/jam/ActivityIndicator'

const meta: Meta<typeof ActivityIndicator> = {
  title: 'Jam/ActivityIndicator',
  component: ActivityIndicator,
  tags: ['autodocs'],
  args: {
    animateEnter: true,
  },
  argTypes: {
    animateEnter: {
      description: 'Enable enter animation',
      control: 'boolean',
    },
  },
}
export default meta

type Story = StoryObj<typeof ActivityIndicator>

export const Default: Story = {
  args: {},
}

export const ElementWithActivityIndicator: Story = {
  render: () => <WithActivityIndicator>Acitivty Text</WithActivityIndicator>,
}
