import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { CurrencySymbol } from '@/components/ui/jam/CurrencySymbol'

const meta: Meta<typeof AppNavbar> = {
  title: 'Layout/AppNavbar',
  component: AppNavbar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof AppNavbar>

const mockFormatAmount = (amount: number) => `${amount.toLocaleString()}`
const mockCurrencySymbol = (size: 'sm' | 'lg') => <CurrencySymbol currency="btc" isPrivate={false} size={size} />
const mockToggleTheme = () => alert('Toggled theme!')
const mockOnLogout = async () => alert('Logged out!')

const defaults = {
  theme: 'dark',
  totalBalance: 21_000_000,
  walletName: 'Satoshi',
  formatAmount: mockFormatAmount,
  currencySymbol: mockCurrencySymbol,
  toggleTheme: mockToggleTheme,
  onLogout: mockOnLogout,
}

export const Default: Story = {
  args: {
    ...defaults,
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
    ...defaults,
  },
}

export const SendActive: Story = {
  args: {
    sessionInfo: {
      maker_running: false,
      coinjoin_in_process: true,
      schedule: undefined,
    },
    ...defaults,
  },
}

export const EarnActive: Story = {
  args: {
    sessionInfo: {
      maker_running: true,
      coinjoin_in_process: false,
      schedule: undefined,
    },
    ...defaults,
  },
}

export const SweepActive: Story = {
  args: {
    sessionInfo: {
      maker_running: false,
      coinjoin_in_process: true,
      schedule: [],
    },
    ...defaults,
  },
}
