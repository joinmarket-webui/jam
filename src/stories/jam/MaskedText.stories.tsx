import type { Meta, StoryObj } from '@storybook/react-vite'
import { MaskedText } from '@/components/ui/jam/MaskedText'

const meta: Meta<typeof MaskedText> = {
  title: 'Jam/MaskedText',
  component: MaskedText,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof MaskedText>

export const Revealed: Story = {
  args: {
    masked: false,
    children: 'correct horse battery staple',
  },
}

export const Masked: Story = {
  args: {
    masked: true,
    children: 'correct horse battery staple',
  },
}

export const CustomMaskedText: Story = {
  args: {
    masked: true,
    maskedText: '•••• •••• •••• ••••',
    children: 'correct horse battery staple',
  },
}

export const Comparison: Story = {
  render: () => (
    <div className="flex flex-col gap-2 font-mono">
      <MaskedText masked={false}>visible wallet seed word</MaskedText>
      <MaskedText masked>hidden wallet seed word</MaskedText>
    </div>
  ),
}
