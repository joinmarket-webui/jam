import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/jam/StatusBadge'
import { UTXO_STATUS_TAG_VARIANTS } from '@/lib/tags'

const meta: Meta<typeof StatusBadge> = {
  title: 'Jam/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof StatusBadge>

export const All: Story = {
  render: () => (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Object.entries(UTXO_STATUS_TAG_VARIANTS).map(([key, val]) => (
          <StatusBadge key={key} variant={val}>
            {key}
          </StatusBadge>
        ))}
      </div>
    </>
  ),
}

export const WithTooltip: Story = {
  render: () => (
    <>
      <StatusBadge tooltip="Tooltip content">Hover me</StatusBadge>
    </>
  ),
}

export const ButtonAsChild: Story = {
  render: () => (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        <StatusBadge asChild variant="cj-out">
          <Button variant="ghost">cj-out</Button>
        </StatusBadge>
        <StatusBadge asChild variant="cj-change">
          <Button variant="ghost">cj-change</Button>
        </StatusBadge>
      </div>
    </>
  ),
}
