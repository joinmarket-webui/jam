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
  isQrLoading = false,
  bitcoinAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
}: {
  initialMode?: 'sats' | 'btc'
  initialAmount?: string
  isQrLoading?: boolean
  bitcoinAddress?: string
}) => {
  const [amountDisplayMode, setAmountDisplayMode] = useState<'sats' | 'btc'>(initialMode)
  const [amount, setAmount] = useState(initialAmount)

  const toggleDisplayMode = () => {
    setAmountDisplayMode((prev) => (prev === 'sats' ? 'btc' : 'sats'))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  const getDisplayAmount = () => {
    return amount
  }

  return (
    <BitcoinAmountInput
      amountDisplayMode={amountDisplayMode}
      getDisplayAmount={getDisplayAmount}
      handleAmountChange={handleAmountChange}
      toggleDisplayMode={toggleDisplayMode}
      isQrLoading={isQrLoading}
      bitcoinAddress={bitcoinAddress}
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

export const LoadingState: Story = {
  render: () => <BitcoinAmountInputWrapper isQrLoading={true} />,
}
