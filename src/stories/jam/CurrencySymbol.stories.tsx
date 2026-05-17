import type { Meta, StoryObj } from '@storybook/react-vite'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'

const meta: Meta<typeof CurrencySymbol> = {
  title: 'Jam/CurrencySymbol',
  component: CurrencySymbol,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof CurrencySymbol>

export const Bitcoin: Story = {
  args: {
    currency: 'btc',
  },
}

export const Sats: Story = {
  args: {
    currency: 'sats',
  },
}

export const Private: Story = {
  args: {
    currency: 'btc',
    isPrivate: true,
  },
}

export const Inline: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-2xl">
      <span>
        <CurrencySymbol currency="btc" /> BTC
      </span>
      <span>
        <CurrencySymbol currency="sats" /> sats
      </span>
      <span>
        <CurrencySymbol currency="btc" isPrivate /> hidden
      </span>
    </div>
  ),
}
