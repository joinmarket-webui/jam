import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '@/components/login/LoginForm'

const meta: Meta<typeof LoginForm> = {
  title: 'Page/Login/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof LoginForm>

export const Default: Story = {
  args: {
    loading: false,
    wallets: ['Satoshi.jmdat'],
    isSubmitting: false,
    disabled: false,
    onSubmit: async () => alert('Submit clicked!'),
  },
}

export const Loading: Story = {
  args: {
    loading: true,
  },
}
