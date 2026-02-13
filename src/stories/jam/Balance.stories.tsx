import type { Meta, StoryObj } from '@storybook/react-vite'
import { Balance } from '@/components/ui/jam/Balance'

const meta: Meta<typeof Balance> = {
  title: 'Jam/Balance',
  component: Balance,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Balance>

export const Bitcoin: Story = {
  args: {
    valueString: '123456789',
    convertToUnit: 'btc',
  },
}

export const Sats: Story = {
  args: {
    valueString: '123456789',
    convertToUnit: 'sats',
  },
}

export const Hidden: Story = {
  args: {
    valueString: '123456789',
    showBalance: false,
  },
}

export const BitcoinValues: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Balance convertToUnit="btc" valueString="0" />
      <Balance convertToUnit="btc" valueString="0.00000001" />
      <Balance convertToUnit="btc" valueString="0.0000001" />
      <Balance convertToUnit="btc" valueString="0.000001" />
      <Balance convertToUnit="btc" valueString="0.00001" />
      <Balance convertToUnit="btc" valueString="0.01" />
      <Balance convertToUnit="btc" valueString="1.0" />
      <Balance convertToUnit="btc" valueString="100.0" />
      <Balance convertToUnit="btc" valueString="0.00021000" />
      <Balance convertToUnit="btc" valueString="0.12345678" />
      <Balance convertToUnit="btc" valueString="1.23456789" />
      <Balance convertToUnit="btc" valueString="20999999.9769" />
      <Balance convertToUnit="btc" valueString="21000000.0" />
      <Balance convertToUnit="btc" valueString="-0.00021000" />
    </div>
  ),
}

export const SatsValues: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Balance convertToUnit="sats" valueString="0" />
      <Balance convertToUnit="sats" valueString="0.00000001" />
      <Balance convertToUnit="sats" valueString="0.0000001" />
      <Balance convertToUnit="sats" valueString="0.000001" />
      <Balance convertToUnit="sats" valueString="0.00001" />
      <Balance convertToUnit="sats" valueString="0.01" />
      <Balance convertToUnit="sats" valueString="1.0" />
      <Balance convertToUnit="sats" valueString="100.0" />
      <Balance convertToUnit="sats" valueString="0.00021000" />
      <Balance convertToUnit="sats" valueString="0.12345678" />
      <Balance convertToUnit="sats" valueString="1.23456789" />
      <Balance convertToUnit="sats" valueString="20999999.9769" />
      <Balance convertToUnit="sats" valueString="21000000.0" />
      <Balance convertToUnit="sats" valueString="-0.00021000" />
    </div>
  ),
}

export const Frozen: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Balance frozen valueString="12345678" convertToUnit="btc" />
      <Balance frozen valueString="12345678" convertToUnit="sats" />
      <Balance frozen valueString="12345678" showBalance={false} />
    </div>
  ),
}

export const BalanceWithVisiblityToggleDisabled: Story = {
  args: {
    valueString: '123456789',
    showBalance: true,
    enableVisibilityToggle: false,
  },
}

export const HiddenWithVisibilityToggleDisabled: Story = {
  args: {
    valueString: '123456789',
    showBalance: false,
    enableVisibilityToggle: false,
  },
}
