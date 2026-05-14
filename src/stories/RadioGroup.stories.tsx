import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const meta: Meta<typeof RadioGroup> = {
  title: 'Core/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof RadioGroup>

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="absolute">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="absolute" value="absolute" />
        <Label htmlFor="absolute">Absolute fee</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="relative" value="relative" />
        <Label htmlFor="relative">Relative fee</Label>
      </div>
    </RadioGroup>
  ),
}

export const DisabledOption: Story = {
  render: () => (
    <RadioGroup defaultValue="one">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="jar-one" value="one" />
        <Label htmlFor="jar-one">Jar 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="jar-two" value="two" disabled />
        <Label htmlFor="jar-two" className="text-muted-foreground">
          Jar 2 disabled
        </Label>
      </div>
    </RadioGroup>
  ),
}

export const Invalid: Story = {
  render: () => (
    <RadioGroup aria-invalid="true">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="invalid-option" value="invalid" aria-invalid="true" />
        <Label htmlFor="invalid-option">Needs attention</Label>
      </div>
    </RadioGroup>
  ),
}
