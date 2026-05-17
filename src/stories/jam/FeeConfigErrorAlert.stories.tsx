import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeeConfigErrorAlert } from '@/components/ui/jam/FeeConfigErrorAlert'

const meta: Meta<typeof FeeConfigErrorAlert> = {
  title: 'Jam/FeeConfigErrorAlert',
  component: FeeConfigErrorAlert,
  tags: ['autodocs'],
  args: {
    onOpenFeeConfig: () => alert('Open fee configuration'),
  },
}
export default meta

type Story = StoryObj<typeof FeeConfigErrorAlert>

export const Default: Story = {}

export const WithSpacing: Story = {
  args: {
    className: 'max-w-2xl',
  },
}
