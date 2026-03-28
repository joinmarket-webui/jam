import type { Meta, StoryObj } from '@storybook/react-vite'
import { CreateStepVerifyMnemonic } from '@/components/create/CreateStepVerifyMnemonic'
import { DUMMY_SEED_PHRASE } from '@/lib/utils'

const meta: Meta<typeof CreateStepVerifyMnemonic> = {
  title: 'Page/Create/CreateStepVerifyMnemonic',
  component: CreateStepVerifyMnemonic,
  tags: ['autodocs'],
  args: {
    onVerified: async () => alert('Verified clicked!'),
    onBack: () => alert('Back clicked!'),
  },
}
export default meta

type Story = StoryObj<typeof CreateStepVerifyMnemonic>

export const Default: Story = {
  args: {
    mnemonicPhrase: DUMMY_SEED_PHRASE,
  },
}
