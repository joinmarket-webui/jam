import type { Meta, StoryObj } from '@storybook/react-vite'
import { Jar } from '@/components/ui/jam/Jar'

const meta: Meta<typeof Jar> = {
  title: 'Jam/Jar',
  component: Jar,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Jar>

export const Standard: Story = {
  args: {
    name: 'Savings Jar',
    totalBalance: 21_000_000,
    availableBalance: 17_000_000,
    frozenOrLockedBalance: 4_000_000,
    color: '#e2b86a',
    totalWalletBalance: 100_000_000,
  },
}

export const Empty: Story = {
  args: {
    ...Standard.args,
    name: 'Empty Jar',
    totalBalance: 0,
    availableBalance: 0,
    frozenOrLockedBalance: 0,
  },
}

export const Full: Story = {
  args: {
    ...Empty.args,
    name: 'Full Jar',
    totalBalance: Empty.args?.totalWalletBalance,
    availableBalance: Empty.args?.totalWalletBalance,
    frozenOrLockedBalance: 0,
  },
}

export const WithForzenOrLocked: Story = {
  args: {
    ...Empty.args,
    name: 'With Frozen Funds',
    totalBalance: Empty.args?.totalWalletBalance,
    availableBalance: 0,
    frozenOrLockedBalance: Empty.args?.totalWalletBalance,
  },
}

export const Disabled: Story = {
  args: {
    ...Standard.args,
    name: 'Disabled Jar',
    disabled: true,
  },
}
