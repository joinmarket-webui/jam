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

export const Frozen: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Balance frozen valueString="12345678" convertToUnit="btc" />
      <Balance frozen valueString="12345678" convertToUnit="sats" />
      <Balance frozen valueString="12345678" />
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

export const Hidden: Story = {
  args: {
    valueString: '123456789',
    showBalance: false,
  },
}

export const HiddenWithVisibilityToggleDisabled: Story = {
  args: {
    valueString: '123456789',
    showBalance: false,
    enableVisibilityToggle: false,
  },
}
