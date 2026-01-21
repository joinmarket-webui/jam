import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const meta: Meta<typeof Spinner> = {
  title: 'Core/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'An indicator that can be used to show a loading state.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Spinner>

export const Default: Story = {
  args: {
    children: 'Label text',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-5" />
      <Spinner className="size-6" />
      <Spinner className="size-7" />
      <Spinner className="size-8" />
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner id="spinner" />
      <Label htmlFor="spinner">Spinner Label</Label>
    </div>
  ),
}

export const WithStrokeWith: Story = {
  render: () => <Spinner strokeWidth={3} />,
}
