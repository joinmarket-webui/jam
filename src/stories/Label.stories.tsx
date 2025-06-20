import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'

const meta: Meta<typeof Label> = {
  title: 'Core/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A label component that provides accessible labeling for form controls.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Label>

export const Default: Story = {
  args: {
    children: 'Label text',
  },
}

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="username">Username</Label>
      <Input id="username" placeholder="Enter username" />
    </div>
  ),
}

export const Required: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">
        Email <span className="text-red-500">*</span>
      </Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  ),
}

export const WithHelpText: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" placeholder="Enter password" />
      <p className="text-muted-foreground text-sm">Must be at least 8 characters long</p>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="group space-y-2" data-disabled="true">
      <Label htmlFor="disabled-input">Disabled Field</Label>
      <Input id="disabled-input" placeholder="This field is disabled" disabled />
    </div>
  ),
}

export const MultipleLabels: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="first-name">First Name</Label>
        <Input id="first-name" placeholder="John" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="last-name">Last Name</Label>
        <Input id="last-name" placeholder="Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
      </div>
    </div>
  ),
}
