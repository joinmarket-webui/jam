import type { Meta, StoryObj } from '@storybook/react-vite'

import { Jar } from '../components/layout/Jar'

const meta: Meta<typeof Jar> = {
  title: 'Core/Jar',
  component: Jar,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Jar>

export const Sats: Story = {
  args: {
    name: 'Savings Jar',
    amount: 15000000,
    color: '#e2b86a',
    displayMode: 'sats',
    totalBalance: 50000000,
  },
}

export const BTC: Story = {
  args: {
    name: 'Main Jar',
    amount: 20000000,
    color: '#3b5ba9',
    displayMode: 'btc',
    totalBalance: 50000000,
  },
}

export const Empty: Story = {
  args: {
    name: 'Empty Jar',
    amount: 0,
    color: '#c94f7c',
    displayMode: 'sats',
    totalBalance: 50000000,
  },
}

export const Full: Story = {
  args: {
    name: 'Full Jar',
    amount: 50000000,
    color: '#a67c52',
    displayMode: 'sats',
    totalBalance: 100000000,
  },
}
