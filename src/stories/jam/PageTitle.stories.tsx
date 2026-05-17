import type { Meta, StoryObj } from '@storybook/react-vite'
import PageTitle from '@/components/ui/jam/PageTitle'

const meta: Meta<typeof PageTitle> = {
  title: 'Jam/PageTitle',
  component: PageTitle,
  tags: ['autodocs'],
  args: {
    title: 'Earn',
    subtitle: 'Offer liquidity to the market while keeping your sats under your control.',
  },
}
export default meta

type Story = StoryObj<typeof PageTitle>

export const Default: Story = {}

export const Centered: Story = {
  args: {
    title: 'Wallet ready',
    subtitle: 'Your wallet is loaded and ready to use.',
    center: true,
  },
}

export const Error: Story = {
  args: {
    title: 'Wallet could not load',
    subtitle: 'Check your connection and try again.',
    variant: 'error',
  },
}
