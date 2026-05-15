import type { Meta, StoryObj } from '@storybook/react-vite'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'

const meta: Meta<typeof ButtonGroup> = {
  title: 'Core/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof ButtonGroup>

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Cancel</Button>
      <Button>Continue</Button>
    </ButtonGroup>
  ),
}

export const WithText: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>Fee</ButtonGroupText>
      <Input defaultValue="21" className="w-24" />
      <ButtonGroupText>sats</ButtonGroupText>
    </ButtonGroup>
  ),
}

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon-sm">
        <MinusIcon />
      </Button>
      <ButtonGroupSeparator />
      <Button variant="outline" size="icon-sm">
        <PlusIcon />
      </Button>
    </ButtonGroup>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
}
