import type { Meta, StoryObj } from '@storybook/react-vite'
import { WalletLoadErrorAlert } from '@/components/ui/jam/WalletLoadErrorAlert'

const meta: Meta<typeof WalletLoadErrorAlert> = {
  title: 'Jam/WalletLoadErrorAlert',
  component: WalletLoadErrorAlert,
  tags: ['autodocs'],
  args: {
    reason: 'Connection refused while loading wallet data.',
  },
}
export default meta

type Story = StoryObj<typeof WalletLoadErrorAlert>

export const Default: Story = {}

export const UnknownReason: Story = {
  args: {
    reason: undefined,
  },
}
