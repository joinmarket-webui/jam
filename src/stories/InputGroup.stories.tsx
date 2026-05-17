import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinIcon, SearchIcon } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'

const meta: Meta<typeof InputGroup> = {
  title: 'Core/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof InputGroup>

export const WithPrefix: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search transactions..." />
    </InputGroup>
  ),
}

export const WithSuffix: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupInput defaultValue="21000" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>sats</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithButton: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <BitcoinIcon aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Amount" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>Max</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="max-w-sm">
      <InputGroupAddon align="block-start">Note</InputGroupAddon>
      <InputGroupTextarea placeholder="Add a wallet note..." />
    </InputGroup>
  ),
}
