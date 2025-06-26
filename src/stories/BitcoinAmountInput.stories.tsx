import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinAmountInput } from '@/components/receive/BitcoinAmountInput'

const meta: Meta<typeof BitcoinAmountInput> = {
  title: 'Receive/BitcoinAmountInput',
  component: BitcoinAmountInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'An input component for entering Bitcoin amounts with the ability to toggle between BTC and sats display modes.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof BitcoinAmountInput>

// Wrapper component to handle state for the storybook examples
const BitcoinAmountInputWrapper = ({
  initialMode = 'sats',
  initialAmount = '',
  disabled = false,
}: {
  initialMode?: 'sats' | 'btc'
  initialAmount?: string
  disabled?: boolean
}) => {
  const [amountDisplayMode, setAmountDisplayMode] = useState<'sats' | 'btc'>(initialMode)
  const [amount, setAmount] = useState(initialAmount)

  const toggleDisplayMode = () => {
    setAmountDisplayMode((prev) => (prev === 'sats' ? 'btc' : 'sats'))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  return (
    <BitcoinAmountInput
      amountDisplayMode={amountDisplayMode}
      value={amount}
      onChange={handleAmountChange}
      toggleDisplayMode={toggleDisplayMode}
      disabled={disabled}
    />
  )
}

export const Default: Story = {
  render: () => <BitcoinAmountInputWrapper />,
}

export const BTCMode: Story = {
  render: () => <BitcoinAmountInputWrapper initialMode="btc" />,
}

export const WithInitialAmount: Story = {
  render: () => <BitcoinAmountInputWrapper initialAmount="1000" initialMode="sats" />,
}

export const DisabledState: Story = {
  render: () => <BitcoinAmountInputWrapper disabled={true} />,
}
