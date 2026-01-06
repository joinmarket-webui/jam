import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
      <AlertDescription>This is a default alert message.</AlertDescription>
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

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Simple Alert</AlertTitle>
      <AlertDescription>This alert doesn't have an icon, just a title and description.</AlertDescription>
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

export const LongContent: Story = {
  render: () => (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Important Notice</AlertTitle>
      <AlertDescription>
        This is a longer alert message that demonstrates how the component handles multiple lines of text. The content
        should wrap naturally and maintain proper spacing and alignment with the icon and title.
      </AlertDescription>
    </Alert>
  ),
}
