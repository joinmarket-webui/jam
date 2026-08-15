import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrderbookEmptyAlert } from '@/components/ui/jam/OrderbookEmptyAlert'

const meta: Meta<typeof OrderbookEmptyAlert> = {
  title: 'Jam/OrderbookEmptyAlert',
  component: OrderbookEmptyAlert,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof OrderbookEmptyAlert>

export const Default: Story = {
  args: {
    isChecking: false,
    onCheckClick: async () => alert('onCheck clicked'),
  },
}

export const Checking: Story = {
  args: {
    isChecking: true,
    onCheckClick: async () => alert('onCheck clicked'),
  },
}
