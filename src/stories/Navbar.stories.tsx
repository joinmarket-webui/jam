import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SidebarProvider } from '@/components/ui/sidebar'

const meta: Meta<typeof Navbar> = {
  title: 'Core/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <SidebarProvider>
          <Story />
        </SidebarProvider>
      </MemoryRouter>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof Navbar>

const mockFormatAmount = (amount: number) => `${amount} sats`
const mockCurrencySymbol = (size: 'sm' | 'lg') => <BitcoinIcon size={size === 'sm' ? 18 : 32} />

export const Default: Story = {
  args: {
    theme: 'light',
    toggleTheme: () => alert('Theme toggled!'),
    formatAmount: mockFormatAmount,
    currencySymbol: mockCurrencySymbol,
    totalBalance: 21_000_000,
  },
}
