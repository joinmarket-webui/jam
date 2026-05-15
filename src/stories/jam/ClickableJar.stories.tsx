import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClickableJar } from '@/components/ui/jam/ClickableJar'

const meta: Meta<typeof ClickableJar> = {
  title: 'Jam/ClickableJar',
  component: ClickableJar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof ClickableJar>

export const Default: Story = {
  args: {
    name: 'Spending',
    color: '#3498db',
    totalBalance: 210_000,
    availableBalance: 190_000,
    frozenOrLockedBalance: 20_000,
    totalWalletBalance: 500_000,
    onClick: () => alert('Jar clicked'),
  },
}

export const Selected: Story = {
  args: {
    ...Default.args,
    name: 'Savings',
    color: '#27ae60',
    isSelected: true,
  },
}

export const Disabled: Story = {
  args: {
    ...Default.args,
    name: 'Archive',
    color: '#f39c12',
    disabled: true,
    onClick: undefined,
  },
}
