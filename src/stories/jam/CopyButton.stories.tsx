import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { CopyButton } from '@/components/ui/jam/CopyButton'

const meta: Meta<typeof CopyButton> = {
  title: 'Jam/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  args: {
    value: 'value',
    text: 'Copy',
    successText: 'Copied',
  },
}
export default meta

type Story = StoryObj<typeof CopyButton>

export const Default: Story = {
  args: {},
}

export const ButtonStyle: Story = {
  args: {
    text: (
      <>
        <CopyIcon className="size-4" />
        Copy
      </>
    ),
    successText: (
      <>
        <CheckIcon className="size-4 text-green-500" />
        Copied
      </>
    ),
    className: buttonVariants({
      size: 'lg',
      variant: 'outline',
    }),
  },
}

export const Callbacks: Story = {
  args: {
    text: (
      <>
        <CopyIcon className="size-4" />
        Copy
      </>
    ),
    successText: (
      <>
        <CheckIcon className="size-4 text-green-500" />
        Copied
      </>
    ),
    onSuccess: () => alert('onSuccess'),
    onError: () => alert('onError'),
    className: buttonVariants({
      size: 'sm',
      variant: 'default',
    }),
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    className: buttonVariants({
      size: 'xs',
      variant: 'outline',
    }),
  },
}
