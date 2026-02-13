import type { Meta, StoryObj } from '@storybook/react-vite'
import { Jar } from '@/components/ui/jam/Jar'

const meta: Meta<typeof Jar> = {
  title: 'Jam/Jar',
  component: Jar,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Jar>

export const Sats: Story = {
  args: {
    name: 'Savings Jar',
    totalBalance: 15_000_000,
    color: '#e2b86a',
    totalWalletBalance: 50_000_000,
  },
}

export const BTC: Story = {
  args: {
    name: 'Main Jar',
    totalBalance: 20000000,
    color: '#3b5ba9',
    totalWalletBalance: 50_000_000,
  },
}

export const Empty: Story = {
  args: {
    name: 'Empty Jar',
    totalBalance: 0,
    color: '#c94f7c',
    totalWalletBalance: 50_000_000,
  },
}

export const Full: Story = {
  args: {
    name: 'Full Jar',
    totalBalance: 50_000_000,
    color: '#a67c52',
    totalWalletBalance: 100_000_000,
  },
}
