import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppNavbar } from '@/components/layout/AppNavbar'
import { withQueryClient } from '../../../.storybook/preview'

const meta: Meta<typeof AppNavbar> = {
  title: 'Layout/AppNavbar',
  component: AppNavbar,
  tags: ['autodocs'],
  decorators: [withQueryClient],
}
export default meta

type Story = StoryObj<typeof AppNavbar>

const mockToggleTheme = () => alert('Toggled theme!')
const mockOnLogout = async () => alert('Logged out!')
const mockOnLockWallet = async () => alert('Locked wallet!')

const defaults: ComponentProps<typeof AppNavbar> = {
  theme: 'dark',
  totalBalance: 21_000_000,
  walletName: 'Satoshi',
  toggleTheme: mockToggleTheme,
  onLogout: mockOnLogout,
  onLockWallet: mockOnLockWallet,
}

export const Default: Story = {
  args: {
    ...defaults,
  },
}

export const Loading: Story = {
  args: {
    ...defaults,
    isLoading: true,
  },
}

export const Reloading: Story = {
  args: {
    ...defaults,
    isLoading: false,
    isReloading: true,
  },
}

export const RescanInProgress: Story = {
  args: {
    ...defaults,
    rescanInfo: {
      rescanning: true,
      progress: 0.21,
      updatedAt: Date.now(),
    },
  },
}

export const SendActive: Story = {
  args: {
    ...defaults,
    sessionInfo: {
      maker_running: false,
      coinjoin_in_process: true,
      schedule: undefined,
    },
  },
}

export const EarnActive: Story = {
  args: {
    ...defaults,
    sessionInfo: {
      maker_running: true,
      coinjoin_in_process: false,
      schedule: undefined,
    },
  },
}

export const SweepActive: Story = {
  args: {
    ...defaults,
    sessionInfo: {
      maker_running: false,
      coinjoin_in_process: true,
      schedule: [],
    },
  },
}
