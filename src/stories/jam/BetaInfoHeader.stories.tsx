import type { Meta, StoryObj } from '@storybook/react-vite'
import BetaInfoHeader from '@/components/layout/header/BetaInfoHeader'

const meta: Meta<typeof BetaInfoHeader> = {
  title: 'Layout/BetaInfoHeader',
  component: BetaInfoHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof BetaInfoHeader>

export const Default: Story = {}
