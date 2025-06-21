import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'

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
        <button style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>Hover me</button>
      </TooltipTrigger>
      <TooltipContent>Tooltip content goes here</TooltipContent>
    </Tooltip>
  ),
}
