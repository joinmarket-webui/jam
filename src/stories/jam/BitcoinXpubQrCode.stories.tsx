import type { Meta, StoryObj } from '@storybook/react-vite'
import { BitcoinXpubQrCode } from '@/components/ui/jam/BitcoinQrCode'

const meta: Meta<typeof BitcoinXpubQrCode> = {
  title: 'Jam/BitcoinXpubQrCode',
  component: BitcoinXpubQrCode,
  tags: ['autodocs'],
  args: {
    xpub: 'vpub5Y6cjg78GGuNLsaPhmYsiw4gYX3HoQiRBiSwDaBXKUafCt9bNwWQiitDk5VZ5BVxYnQdwoTyXSs2JHRPAgjAvtbBrf8ZhDYe2jWAqvZVnsc',
    width: 250,
  },
  argTypes: {},
}
export default meta

type Story = StoryObj<typeof BitcoinXpubQrCode>

export const Default: Story = {
  args: {},
}
