import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginCard } from '@/components/login/LoginCard'
import type { WalletFileName } from '@/lib/utils'

const meta: Meta<typeof LoginCard> = {
  title: 'Page/Login/LoginCard',
  component: LoginCard,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof LoginCard>

const WALLETS = [
  'Satoshi.jmdat',
  'Wallet With Whitespaces.jmdat',
  'a.jmdat',
  'A very long wallet name that should be shortened but show start and end of name.jmdat',
] as WalletFileName[]

export const Default: Story = {
  args: {
    wallets: WALLETS,
    activeWallet: undefined,
    makerRunning: false,
    coinjoinInProgress: false,
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
  argTypes: {
    activeWallet: {
      control: 'select',
      options: [...WALLETS, 'None'],
    },
  },
}

export const Empty: Story = {
  args: {
    wallets: [],
    activeWallet: undefined,
    makerRunning: false,
    coinjoinInProgress: false,
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
}

export const Loading: Story = {
  args: {
    listWalletsLoading: true,
  },
}
export const Fetching: Story = {
  args: {
    listWalletsFetching: true,
    wallets: WALLETS,
  },
}

export const Error: Story = {
  args: {
    listWalletsError: {
      message: 'Wallet loading failed.',
      error_description: '500 Server Error',
    },
    onReloadClick: async () => alert('Reload clicked!'),
  },
}
