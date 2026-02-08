import type { Meta, StoryObj } from '@storybook/react-vite'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'
import { Jar } from '@/components/ui/jam/Jar'
import type { Currency } from '@/types/global'

const meta: Meta<typeof Jar> = {
  title: 'Jam/Jar',
  component: Jar,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Jar>

const formatAmount = (amount: number, currency: Currency): string => {
  if (currency === 'btc') {
    return (amount / 100_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    })
  }

  return amount.toLocaleString()
}

export const Sats: Story = {
  args: {
    name: 'Savings Jar',
    totalBalance: 15_000_000,
    color: '#e2b86a',
    currencySymbol: (size: 'sm' | 'lg') => <CurrencySymbol size={size} currency="sats" />,
    formatAmount: () => formatAmount(15_000_000, 'sats'),
    totalWalletBalance: 50_000_000,
  },
}

export const BTC: Story = {
  args: {
    name: 'Main Jar',
    totalBalance: 20000000,
    color: '#3b5ba9',
    currencySymbol: (size: 'sm' | 'lg') => <CurrencySymbol size={size} currency="btc" />,
    formatAmount: () => formatAmount(20_000_000, 'btc'),
    totalWalletBalance: 50_000_000,
  },
}

export const Empty: Story = {
  args: {
    name: 'Empty Jar',
    totalBalance: 0,
    color: '#c94f7c',
    currencySymbol: (size: 'sm' | 'lg') => <CurrencySymbol size={size} currency="sats" />,
    formatAmount: () => formatAmount(0, 'sats'),
    totalWalletBalance: 50_000_000,
  },
}

export const Full: Story = {
  args: {
    name: 'Full Jar',
    totalBalance: 50_000_000,
    color: '#a67c52',
    currencySymbol: (size: 'sm' | 'lg') => <CurrencySymbol size={size} currency="sats" />,
    formatAmount: () => formatAmount(50_000_000, 'sats'),
    totalWalletBalance: 100_000_000,
  },
}
