import type { Meta, StoryObj } from '@storybook/react-vite'
import { Address } from '@/components/ui/jam/Address'

const meta: Meta<typeof Address> = {
  title: 'Jam/Address',
  component: Address,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Address>

export const PlainAddress: Story = {
  args: {
    value: 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx',
    copyable: false,
  },
}
export const CopyableAddress: Story = {
  args: {
    value: 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx',
    copyable: true,
  },
}
