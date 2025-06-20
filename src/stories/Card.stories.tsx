import type { Meta, StoryObj } from '@storybook/react-vite'

import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const meta: Meta<typeof Card> = {
  title: 'Core/Card',
  component: Card,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a card description.</CardDescription>
      </CardHeader>
      <div style={{ padding: 24 }}>Card content goes here.</div>
    </Card>
  ),
}
