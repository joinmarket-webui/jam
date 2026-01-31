import type { Meta, StoryObj } from '@storybook/react-vite'
import { CreateStepDetailsInput } from '@/components/create/CreateStepDetailsInput'

const meta: Meta<typeof CreateStepDetailsInput> = {
  title: 'Page/Create/CreateStepDetailsInput',
  component: CreateStepDetailsInput,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof CreateStepDetailsInput>

export const Default: Story = {
  args: {
    wallets: ['Satoshi.jmdat'],
    mode: 'onChange',
    onSubmit: async () => alert('Submit clicked!'),
    sessionInfo: undefined,
  },
}

export const WithActiveSession: Story = {
  args: {
    wallets: [],
    onSubmit: async () => alert('Submit clicked!'),
    sessionInfo: {
      session: true,
      wallet_name: 'Satoshi.jmdat',
      maker_running: false,
      coinjoin_in_process: false,
      rescanning: false,
    },
  },
}
