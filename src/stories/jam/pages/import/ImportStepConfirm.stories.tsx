import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImportStepConfirm } from '@/components/import/ImportStepConfirm'
import { DUMMY_SEED_PHRASE } from '@/lib/utils'

const meta: Meta<typeof ImportStepConfirm> = {
  title: 'Page/Import/ImportStepConfirm',
  component: ImportStepConfirm,
  tags: ['autodocs'],
  args: {
    mode: 'onChange',
    onConfirm: async () => alert('Confirm clicked!'),
    onBack: async () => alert('Back clicked!'),
  },
}
export default meta

type Story = StoryObj<typeof ImportStepConfirm>

export const Default: Story = {
  args: {
    walletFileName: 'Satoshi.jmdat',
    password: 'correct horse battery staple',
    seedphrase: DUMMY_SEED_PHRASE,
  },
}
