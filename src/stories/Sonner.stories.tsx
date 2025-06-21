import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Toaster } from '../components/ui/sonner'

const meta: Meta<typeof Toaster> = {
  title: 'Core/Sonner',
  component: Toaster,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A toast notification component built on top of Sonner for displaying temporary messages.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Toaster>

// Helper component to demonstrate toasts
const ToastDemo = ({
  type,
  message,
  description,
}: {
  type: 'default' | 'success' | 'error' | 'warning' | 'info'
  message: string
  description?: string
}) => {
  const showToast = () => {
    switch (type) {
      case 'success':
        toast.success(message, { description })
        break
      case 'error':
        toast.error(message, { description })
        break
      case 'warning':
        toast.warning(message, { description })
        break
      case 'info':
        toast.info(message, { description })
        break
      default:
        toast(message, { description })
    }
  }

  return (
    <div>
      <Button onClick={showToast}>Show {type} toast</Button>
      <Toaster />
    </div>
  )
}

export const Default: Story = {
  render: () => <ToastDemo type="default" message="This is a default toast" />,
}

export const Success: Story = {
  render: () => <ToastDemo type="success" message="Success!" description="Your action was completed successfully." />,
}

export const Error: Story = {
  render: () => (
    <ToastDemo type="error" message="Error occurred" description="Something went wrong. Please try again." />
  ),
}

export const Warning: Story = {
  render: () => (
    <ToastDemo type="warning" message="Warning" description="Please review your input before proceeding." />
  ),
}

export const Info: Story = {
  render: () => <ToastDemo type="info" message="Information" description="Here's some helpful information for you." />,
}

export const WithDescription: Story = {
  render: () => (
    <ToastDemo
      type="default"
      message="Update available"
      description="A new version of the application is ready to install."
    />
  ),
}

export const Multiple: Story = {
  render: () => {
    const showMultipleToasts = () => {
      toast('First toast')
      setTimeout(() => toast.success('Second toast'), 500)
      setTimeout(() => toast.error('Third toast'), 1000)
      setTimeout(() => toast.warning('Fourth toast'), 1500)
    }

    return (
      <div>
        <Button onClick={showMultipleToasts}>Show multiple toasts</Button>
        <Toaster />
      </div>
    )
  },
}

export const CustomPosition: Story = {
  render: () => (
    <div>
      <Button onClick={() => toast('Toast with custom position')}>Show toast</Button>
      <Toaster position="top-center" />
    </div>
  ),
}

export const WithAction: Story = {
  render: () => {
    const showActionToast = () => {
      toast('File uploaded', {
        description: 'Your file has been uploaded successfully.',
        action: {
          label: 'View',
          onClick: () => console.log('View clicked'),
        },
      })
    }

    return (
      <div>
        <Button onClick={showActionToast}>Show toast with action</Button>
        <Toaster />
      </div>
    )
  },
}
