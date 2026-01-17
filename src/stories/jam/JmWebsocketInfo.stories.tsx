import type { Meta, StoryObj } from '@storybook/react-vite'
import { JmWebsocketInfo } from '@/components/ui/jam/JmWebsocketInfo'

const meta: Meta<typeof JmWebsocketInfo> = {
  title: 'Jam/JmWebsocketInfo',
  component: JmWebsocketInfo,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof JmWebsocketInfo>

export const All: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-8">
      <JmWebsocketInfo isAuthenticated={false} isOpen={false} />
      <JmWebsocketInfo isAuthenticated={false} isOpen={true} />
      <JmWebsocketInfo isAuthenticated={true} isOpen={true} />
    </div>
  ),
}

export const Disconnected: Story = {
  render: () => <JmWebsocketInfo isAuthenticated={false} isOpen={false} />,
}

export const Connected: Story = {
  render: () => <JmWebsocketInfo isAuthenticated={false} isOpen={true} />,
}

export const Authenticated: Story = {
  render: () => <JmWebsocketInfo isAuthenticated={true} isOpen={true} />,
}
