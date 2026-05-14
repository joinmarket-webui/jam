import type { Meta, StoryObj } from '@storybook/react-vite'
import { JarIcon } from '@/components/ui/jam/JarIcon'

const meta: Meta<typeof JarIcon> = {
  title: 'Jam/JarIcon',
  component: JarIcon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}
export default meta

type Story = StoryObj<typeof JarIcon>

export const Empty: Story = {
  args: {
    color: '#e2b86a',
    totalBalance: 0,
    totalWalletBalance: 100_000,
  },
}

export const HalfFull: Story = {
  args: {
    color: '#27ae60',
    totalBalance: 50_000,
    totalWalletBalance: 100_000,
  },
}

export const Selected: Story = {
  args: {
    ...HalfFull.args,
    isSelected: true,
  },
}

export const Disabled: Story = {
  args: {
    ...HalfFull.args,
    disabled: true,
  },
}

export const FillLevels: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {[0, 10_000, 30_000, 60_000].map((totalBalance) => (
        <JarIcon key={totalBalance} color="#3498db" totalBalance={totalBalance} totalWalletBalance={100_000} />
      ))}
    </div>
  ),
}
