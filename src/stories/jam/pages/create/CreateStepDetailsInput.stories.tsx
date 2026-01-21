import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { CreateStepDetailsInput } from '@/components/create/CreateStepDetailsInput'

const meta: Meta<typeof CreateStepDetailsInput> = {
  title: 'Page/Create/CreateStepDetailsInput',
  component: CreateStepDetailsInput,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof CreateStepDetailsInput>

export const Default: Story = {
  args: {
    onSubmit: async () => alert('Submit clicked!'),
    isSubmitting: false,
    sessionInfo: undefined,
  },
}

export const WithActiveSession: Story = {
  args: {
    onSubmit: async () => alert('Submit clicked!'),
    isSubmitting: false,
    sessionInfo: {
      session: true,
      wallet_name: 'Satoshi.jmdat',
      maker_running: false,
      coinjoin_in_process: false,
      rescanning: false,
    },
  },
}
