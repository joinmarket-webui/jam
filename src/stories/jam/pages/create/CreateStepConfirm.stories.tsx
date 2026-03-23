import type { Meta, StoryObj } from '@storybook/react-vite'
import { CreateStepConfirm } from '@/components/create/CreateStepConfirm'
import { DUMMY_SEED_PHRASE } from '@/lib/utils'

const meta: Meta<typeof CreateStepConfirm> = {
  title: 'Page/Create/CreateStepConfirm',
  component: CreateStepConfirm,
  tags: ['autodocs'],
  args: {
    mode: 'onChange',
    onConfirm: async () => alert('Confirm clicked!'),
  },
}
export default meta

type Story = StoryObj<typeof CreateStepConfirm>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    password: 'correct horse battery staple',
    mnemonicPhrase: DUMMY_SEED_PHRASE,
  },
}
