import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const meta: Meta<typeof Textarea> = {
  title: 'Core/Textarea',
  component: Textarea,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Textarea>

export const Default: Story = {
  args: {
    placeholder: 'Write a note...',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Write your message..." />
    </div>
  ),
}

export const WithValue: Story = {
  args: {
    defaultValue: 'This is a longer value that shows how multiline content looks inside the textarea.',
  },
}

export const Invalid: Story = {
  args: {
    placeholder: 'This field has an error',
    'aria-invalid': true,
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
}
