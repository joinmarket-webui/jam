import type { Meta, StoryObj } from '@storybook/react-vite'
import { CloudDownloadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { type ToastT } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/sonner.css'

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
  ...props
}: {
  type: ToastT['type']
  message: string
  description?: ToastT['description']
  icon?: ToastT['icon']
  duration?: ToastT['duration']
}) => {
  const showToast = () => {
    switch (type) {
      case 'success': {
        toast.success(message, props)
        break
      }
      case 'error': {
        toast.error(message, props)
        break
      }
      case 'warning': {
        toast.warning(message, props)
        break
      }
      case 'info': {
        toast.info(message, props)
        break
      }
      case 'loading': {
        toast.loading(message, props)
        break
      }
      default: {
        toast(message, props)
      }
    }
  }

  return (
    <div className="my-4">
      <Button onClick={showToast}>Show {type} toast</Button>
      <Toaster closeButton />
    </div>
  )
}

export const Default: Story = {
  render: () => <ToastDemo type="default" message="This is a default toast" />,
}

export const Info: Story = {
  render: () => <ToastDemo type="info" message="Information" description="Here's some helpful information for you." />,
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

export const Loading: Story = {
  render: () => (
    <ToastDemo type="loading" message="Loading" description="Please be patient. This might take a minute..." />
  ),
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

export const WithIcon: Story = {
  render: () => (
    <ToastDemo
      type="default"
      icon={<CloudDownloadIcon />}
      message="Update available"
      description="A new version of the application is ready to install."
      duration={Number.POSITIVE_INFINITY}
    />
  ),
}

export const Multiple: Story = {
  render: () => {
    return (
      <div>
        <Button
          onClick={() => {
            toast('First toast')
            setTimeout(() => toast.success('Second toast'), 500)
            setTimeout(() => toast.error('Third toast'), 1000)
            setTimeout(() => toast.warning('Fourth toast'), 1500)
          }}
        >
          Show multiple toasts
        </Button>
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
    return (
      <div>
        <Button
          onClick={() => {
            toast('File uploaded', {
              description: 'Your file has been uploaded successfully.',
              action: {
                label: 'View',
                onClick: () => alert('View clicked'),
              },
            })
          }}
        >
          Show toast with action
        </Button>
        <Toaster />
      </div>
    )
  },
}
