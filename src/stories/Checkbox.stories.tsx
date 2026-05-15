import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const meta: Meta<typeof Checkbox> = {
  title: 'Core/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-terms-default" />
      <Label htmlFor="checkbox-terms-default">Accept terms</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-checked" defaultChecked />
      <Label htmlFor="checkbox-checked">Selected option</Label>
    </div>
  ),
}

export const Indeterminate: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-indeterminate" checked="indeterminate" />
      <Label htmlFor="checkbox-indeterminate">Partially selected</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-disabled" disabled />
      <Label htmlFor="checkbox-disabled" className="text-muted-foreground">
        Disabled option
      </Label>
    </div>
  ),
}

export const Invalid: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-invalid" aria-invalid="true" />
      <Label htmlFor="checkbox-invalid">Needs attention</Label>
    </div>
  ),
}
