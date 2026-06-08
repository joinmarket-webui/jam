import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Core/Avatar',
  component: Avatar,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Avatar>

export const WithImage: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="/favicon.svg" alt="Avatar" />
      <AvatarFallback>AB</AvatarFallback>
    </Avatar>
  ),
}

export const WithFallback: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>CD</AvatarFallback>
    </Avatar>
  ),
}
