import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { OnboardingDialog } from '@/components/login/OnboardingDialog'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof OnboardingDialog> = {
  title: 'Page/Login/OnboardingDialog',
  component: OnboardingDialog,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof OnboardingDialog>

const OnboardingDialogDemo = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>Open onboarding dialog</Button>
      <OnboardingDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}

export const Default: Story = {
  render: () => <OnboardingDialogDemo />,
}
