import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinAddressQrCode } from '@/components/ui/jam/BitcoinQrCode'

const meta: Meta<typeof BitcoinAddressQrCode> = {
  title: 'Jam/BitcoinAddressQrCode',
  component: BitcoinAddressQrCode,
  tags: ['autodocs'],
  args: {
    address: 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx',
    width: 250,
  },
  argTypes: {},
}
export default meta

type Story = StoryObj<typeof BitcoinAddressQrCode>

export const Default: Story = {
  args: {},
}

export const Legacy: Story = {
  args: {
    address: 'mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV',
  },
}
