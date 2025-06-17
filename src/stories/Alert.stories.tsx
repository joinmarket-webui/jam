import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

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
      <AlertCircle />
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>This is a default alert message.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle />
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
    <Alert>
      <CheckCircle2 />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>Your action was completed successfully!</AlertDescription>
    </Alert>
  ),
}

export const LongContent: Story = {
  render: () => (
    <Alert>
      <AlertCircle />
      <AlertTitle>Important Notice</AlertTitle>
      <AlertDescription>
        This is a longer alert message that demonstrates how the component handles multiple lines of text. The content
        should wrap naturally and maintain proper spacing and alignment with the icon and title.
      </AlertDescription>
    </Alert>
  ),
}
