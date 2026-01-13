import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/ui/badge'

const meta: Meta<typeof Badge> = {
  title: 'Core/Badge',
  component: Badge,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Badge>

export const Variants: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-8">
      <Badge variant="default">default</Badge>
      <Badge variant="destructive">destructive</Badge>
      <Badge variant="dev">dev</Badge>
      <Badge variant="outline">outline</Badge>
      <Badge variant="secondary">secondary</Badge>
    </div>
  ),
}

export const Default: Story = {
  args: {
    children: 'Default Badge',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Badge',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive Badge',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Badge',
  },
}
