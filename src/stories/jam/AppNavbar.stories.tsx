import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { AppNavbar } from '@/components/layout/AppNavbar'

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

const mockFormatAmount = (amount: number) => `${amount}`
const mockCurrencySymbol = (size: 'sm' | 'lg') => <BitcoinIcon size={size === 'sm' ? 18 : 32} />
const mockToggleTheme = () => alert('Toggled theme!')
const mockOnLogout = async () => alert('Logged out!')

export const Default: Story = {
  args: {
    theme: 'light',
    totalBalance: 21_000_000,
    walletName: 'Satoshi',
    formatAmount: mockFormatAmount,
    currencySymbol: mockCurrencySymbol,
    toggleTheme: mockToggleTheme,
    onLogout: mockOnLogout,
  },
}
