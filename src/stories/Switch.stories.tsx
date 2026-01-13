import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const meta: Meta<typeof Switch> = {
  title: 'Core/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A switch component built on top of Radix UI with customizable styling.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Switch>

export const Default: Story = {
  args: {
    children: 'Label text',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="switch" />
      <Label htmlFor="switch">Switch Label</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => <Switch disabled={true} />,
}
