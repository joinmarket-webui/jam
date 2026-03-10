import type { Meta, StoryObj } from '@storybook/react-vite'
import { Address } from '@/components/ui/jam/Address'

const meta: Meta<typeof Address> = {
  title: 'Jam/Address',
  component: Address,
  tags: ['autodocs'],
  args: {
    chunked: true,
    copyable: true,
  },
  argTypes: {
    chunked: {
      description: 'Enable address chunking',
      control: 'boolean',
    },
    copyable: {
      description: 'Enable copy to clipboard',
      control: 'boolean',
    },
  },
}
export default meta

type Story = StoryObj<typeof Address>

export const PlainAddress: Story = {
  args: {
    value: 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx',
  },
}

export const CopyableAddress: Story = {
  args: {
    ...PlainAddress.args,
    copyable: true,
  },
}

export const AddressChunkingDisabled: Story = {
  args: {
    ...PlainAddress.args,
    chunked: false,
  },
}

export const Formats: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Address value="bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx" />
      <Address value="mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV" />
      <Address value="2Mww8dCYPUpKHofjgcXcBCEGmniw9CoaiD2" />
    </div>
  ),
}
