import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { Footer } from '@/components/Footer'

const meta: Meta<typeof Footer> = {
  title: 'Core/Footer',
  component: Footer,
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

type Story = StoryObj<typeof Footer>

export const Default: Story = {
  render: () => <Footer />,
}
