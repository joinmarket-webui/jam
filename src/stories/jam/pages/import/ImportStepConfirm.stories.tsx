import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImportStepConfirm } from '@/components/import/ImportStepConfirm'
import { DUMMY_SEED_PHRASE, SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'

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
    value: {
      walletDetails: {
        walletName: 'Satoshi',
        password: 'correct horse battery staple',
        confirmPassword: 'correct horse battery staple',
      },
      importDetails: {
        mnemonicPhrase: DUMMY_SEED_PHRASE.join(' '),
        blockheight: SEGWIT_ACTIVATION_BLOCK,
        gaplimit: 21,
      },
    },
  },
}
