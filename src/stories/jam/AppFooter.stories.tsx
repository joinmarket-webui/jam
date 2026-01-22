import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { AppFooter } from '@/components/layout/AppFooter'
import { APP_DISPLAY_VERSION } from '@/constants/jam'
import { toSemVer } from '@/lib/utils'

const meta: Meta<typeof AppFooter> = {
  title: 'Layout/AppFooter',
  component: AppFooter,
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

type Story = StoryObj<typeof AppFooter>

export const Default: Story = {
  render: () => (
    <AppFooter
      websocketInfo={{ isOpen: true, isAuthenticated: true }}
      jamVersion={APP_DISPLAY_VERSION}
      joinmarketVersion={toSemVer('0.9.12')}
      onClickCheatsheet={() => alert('Cheatsheet clicked!')}
      onClickOrderbook={() => alert('Orderbook clicked!')}
      onClickLogs={() => alert('Logs clicked!')}
    />
  ),
}
