import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImportStepImportDetails } from '@/components/import/ImportStepImportDetails'
import { DUMMY_SEED_PHRASE } from '@/lib/utils'

const meta: Meta<typeof ImportStepImportDetails> = {
  title: 'Page/Import/ImportStepImportDetails',
  component: ImportStepImportDetails,
  tags: ['autodocs'],
  args: {
    mode: 'onChange',
    onSubmit: async () => alert('Submit clicked!'),
    onBack: async () => alert('Back clicked!'),
  },
}
export default meta

type Story = StoryObj<typeof ImportStepImportDetails>

export const Default: Story = {
  args: {
    sessionInfo: undefined,
  },
}

export const WithInvalidMnemonicPhrase: Story = {
  args: {
    sessionInfo: undefined,
    mode: 'all',
    initialValues: {
      mnemonicPhrase: 'invalid mnemonic',
    },
  },
}

export const WithValidMnemonicPhrase: Story = {
  args: {
    sessionInfo: undefined,
    mode: 'all',
    initialValues: {
      mnemonicPhrase: DUMMY_SEED_PHRASE.join(' '),
    },
  },
}

export const WithActiveSession: Story = {
  args: {
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
    sessionInfo: {
      session: false,
      wallet_name: 'Satoshi.jmdat',
      maker_running: false,
      coinjoin_in_process: false,
      rescanning: true,
    },
  },
}
