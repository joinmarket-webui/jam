import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImportStepWalletDetails } from '@/components/import/ImportStepWalletDetails'

const meta: Meta<typeof ImportStepWalletDetails> = {
  title: 'Page/Import/ImportStepWalletDetails',
  component: ImportStepWalletDetails,
  tags: ['autodocs'],
  args: {
    mode: 'onChange',
    onSubmit: async () => alert('Submit clicked!'),
    submitButtonText: () => 'Submit',
  },
}
export default meta

type Story = StoryObj<typeof ImportStepWalletDetails>

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

export const WithActiveRescan: Story = {
  args: {
    wallets: [],
    sessionInfo: {
      session: false,
      wallet_name: 'Satoshi.jmdat',
      maker_running: false,
      coinjoin_in_process: false,
      rescanning: true,
    },
  },
}
