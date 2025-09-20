import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinAmountInput } from '@/components/receive/BitcoinAmountInput'
import type { Currency } from '@/hooks/useDisplaySettings'

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
  initialCurrency = 'sats',
  initialAmount = '',
  isPrivate = false,
  disabled = false,
  label,
  placeholder,
}: {
  initialCurrency?: Currency
  initialAmount?: string
  isPrivate?: boolean
  disabled?: boolean
  label?: string
  placeholder?: string
}) => {
  const [currencyDisplayMode, setCurrencyDisplayMode] = useState<Currency>(initialCurrency)
  const [amount, setAmount] = useState(initialAmount)

  const toggleCurrencyUnit = () => {
    setCurrencyDisplayMode((prev) => (prev === 'sats' ? 'btc' : 'sats'))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  return (
    <BitcoinAmountInput
      label={label}
      placeholder={placeholder}
      currency={currencyDisplayMode}
      isPrivate={isPrivate}
      value={amount}
      onChange={handleAmountChange}
      toggleCurrencyUnit={toggleCurrencyUnit}
      disabled={disabled}
    />
  )
}

export const Default: Story = {
  render: () => <BitcoinAmountInputWrapper label="Amount" placeholder="Enter amount" />,
}

export const BTCMode: Story = {
  render: () => <BitcoinAmountInputWrapper initialCurrency="btc" label="Amount in BTC" placeholder="0.00000000" />,
}

export const WithInitialAmount: Story = {
  render: () => (
    <BitcoinAmountInputWrapper
      initialAmount="1000"
      initialCurrency="sats"
      label="Amount in Sats"
      placeholder="Enter sats"
    />
  ),
}

export const DisabledState: Story = {
  render: () => (
    <BitcoinAmountInputWrapper disabled={true} label="Amount (Disabled)" placeholder="Cannot enter amount" />
  ),
}

export const WithoutLabel: Story = {
  render: () => <BitcoinAmountInputWrapper placeholder="No label example" />,
}
