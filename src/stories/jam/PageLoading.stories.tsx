import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageLoading } from '@/components/ui/jam/PageLoading'

const meta: Meta<typeof PageLoading> = {
  title: 'Jam/PageLoading',
  component: PageLoading,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof PageLoading>

export const Default: Story = {}
