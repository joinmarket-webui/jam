import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const meta: Meta<typeof Popover> = {
  title: 'Core/Popover',
  component: Popover,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Popover>

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="grid gap-3">
          <div className="space-y-1">
            <h4 className="leading-none font-medium">Fee target</h4>
            <p className="text-muted-foreground text-sm">Tune how quickly the transaction should confirm.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fee-target">Blocks</Label>
            <Input id="fee-target" defaultValue="6" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const Compact: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          Details
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <p className="text-sm">This jar has enough confirmed balance to be used for spending.</p>
      </PopoverContent>
    </Popover>
  ),
}
