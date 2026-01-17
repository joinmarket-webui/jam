import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof Alert> = {
  title: 'Core/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A flexible alert component that can display different types of messages with optional icons.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Alert>

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>This is an alert with icon, title and description.</AlertDescription>
    </Alert>
  ),
}

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>This alert doesn't have an icon, just a title and description.</AlertDescription>
    </Alert>
  ),
}

export const WithoutDescription: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>This Alert has a title and an icon. No description.</AlertTitle>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong. Please try again later.</AlertDescription>
    </Alert>
  ),
}

export const Success: Story = {
  render: () => (
    <Alert variant="success">
      <CheckCircle2Icon />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>Your action was completed successfully!</AlertDescription>
    </Alert>
  ),
}

export const Warning: Story = {
  render: () => (
    <Alert variant="warning">
      <AlertCircleIcon />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>Your action was not successfully completed!</AlertDescription>
    </Alert>
  ),
}

export const WithDescriptionLong: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>
        This is a longer alert message that demonstrates how the component handles multiple lines of text. The content
        should wrap naturally and maintain proper spacing and alignment with the icon and title.
      </AlertDescription>
    </Alert>
  ),
}

export const WithDescriptionList: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>
        <p>Please verify your billing information and try again.</p>
        <ul className="list-inside list-disc text-sm">
          <li>Check your card details</li>
          <li>Ensure sufficient funds</li>
          <li>Verify billing address</li>
        </ul>
      </AlertDescription>
    </Alert>
  ),
}

export const WithDescriptionLink: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>
        <p>
          This is an alert with icon, title and a description <strong>with a link</strong>.{' '}
          <a href="#" className="underline">
            Follow this link
          </a>
          .
        </p>
      </AlertDescription>
    </Alert>
  ),
}

export const WithDescriptionButtons: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>
        <p>
          This is an alert with icon, title and description <strong>with buttons</strong>.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm">Action 1</Button>
          <Button size="sm" variant="outline">
            Action 2
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  ),
}
