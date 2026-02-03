import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '@/components/login/LoginForm'
import type { WalletFileName } from '@/lib/utils'

const meta: Meta<typeof LoginForm> = {
  title: 'Page/Login/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof LoginForm>

const WALLETS = [
  'Satoshi.jmdat',
  'Wallet With Whitespaces.jmdat',
  'a.jmdat',
  'A very long wallet name that should be shortened but show start and end of name.jmdat',
] as WalletFileName[]

export const Default: Story = {
  args: {
    loading: false,
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

export const Loading: Story = {
  args: {
    loading: true,
  },
}

export const OneWallet: Story = {
  args: {
    loading: false,
    wallets: ['Satoshi.jmdat'],
    activeWallet: undefined,
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
}

export const ActiveWallet: Story = {
  args: {
    loading: false,
    wallets: WALLETS,
    activeWallet: WALLETS[0],
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
}

export const ActiveWalletWithMakerRunning: Story = {
  args: {
    loading: false,
    wallets: WALLETS,
    activeWallet: WALLETS[0],
    makerRunning: true,
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
}

export const Disabled: Story = {
  args: {
    loading: false,
    wallets: ['Satoshi.jmdat'],
    activeWallet: undefined,
    disabled: true,
    onSubmit: async () => alert('Submit clicked!'),
  },
}
