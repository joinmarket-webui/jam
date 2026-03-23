import type { Meta, StoryObj } from '@storybook/react-vite'
import { CreateStepWalletDetails } from '@/components/create/CreateStepWalletDetails'

const meta: Meta<typeof CreateStepWalletDetails> = {
  title: 'Page/Create/CreateStepWalletDetails',
  component: CreateStepWalletDetails,
  tags: ['autodocs'],
  args: {
    mode: 'onChange',
    onSubmit: async () => alert('Submit clicked!'),
    submitButtonText: () => 'Submit',
  },
}
export default meta

type Story = StoryObj<typeof CreateStepWalletDetails>

export const Default: Story = {
  args: {
    wallets: ['test.jmdat', 'Satoshi.jmdat'],
    sessionInfo: undefined,
  },
}

export const WithActiveSession: Story = {
  args: {
    wallets: [],
    sessionInfo: {
      session: true,
      wallet_name: 'Satoshi.jmdat',
      maker_running: false,
      coinjoin_in_process: false,
      rescanning: false,
    },
  },
}
