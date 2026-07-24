import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>Card Content</CardContent>
      <CardFooter>Card Footer</CardFooter>
    </Card>
  ),
}

export const Small: Story = {
  render: (args) => (
    <Card {...args} size="sm">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>Card Content</CardContent>
      <CardFooter>Card Footer</CardFooter>
    </Card>
  ),
}

/**
 * Use the `CardAction` component to add interactive elements in the header.
 */
export const WithCardAction: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Team Settings</CardTitle>
        <CardDescription>Manage your team preferences</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Configure team members, permissions, and notifications.</p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost">Cancel</Button>
        <Button className="ml-auto">Save Changes</Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * A minimal card with only content, no header or footer.
 */
export const MinimalCard: Story = {
  render: (args) => (
    <Card {...args}>
      <CardContent>
        <p className="text-sm">
          This is a minimal card with only content. Perfect for displaying simple information without the need for a
          header or footer.
        </p>
      </CardContent>
    </Card>
  ),
}

/**
 * A card with only a header section, no content or footer.
 */
export const HeaderOnly: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
        <CardDescription>Your account summary at a glance. Click for details.</CardDescription>
      </CardHeader>
    </Card>
  ),
}
