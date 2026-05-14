import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyIcon } from 'lucide-react'
import { CopyButton } from '@/components/ui/jam/CopyButton'

const meta: Meta<typeof CopyButton> = {
  title: 'Jam/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  args: {
    value: 'bc1qexampleaddress000000000000000000000000000',
    text: (
      <span className="inline-flex items-center gap-2">
        <CopyIcon className="h-4 w-4" />
        Copy address
      </span>
    ),
    successText: 'Copied',
    className: 'rounded-md border px-3 py-2 text-sm hover:bg-accent',
  },
}
export default meta

type Story = StoryObj<typeof CopyButton>

export const Default: Story = {}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}
