import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppFooter } from '@/components/layout/AppFooter'
import { APP_DISPLAY_VERSION } from '@/constants/jam'
import { parseSemanticVersion } from '@/lib/utils'

const meta: Meta<typeof AppFooter> = {
  title: 'Layout/AppFooter',
  component: AppFooter,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof AppFooter>

export const Default: Story = {
  render: () => (
    <AppFooter
      websocketInfo={{ isOpen: true, isAuthenticated: true }}
      jamVersion={APP_DISPLAY_VERSION}
      joinmarketVersion={parseSemanticVersion('0.9.12')}
      onClickCheatsheet={() => alert('Cheatsheet clicked!')}
      onClickOrderbook={() => alert('Orderbook clicked!')}
      onClickLogs={() => alert('Logs clicked!')}
    />
  ),
}
