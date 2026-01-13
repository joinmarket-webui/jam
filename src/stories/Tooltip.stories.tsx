import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const meta: Meta<typeof Tooltip> = {
  title: 'Core/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Tooltip content goes here</TooltipContent>
    </Tooltip>
  ),
}
