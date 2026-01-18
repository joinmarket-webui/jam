import type { Meta, StoryObj } from '@storybook/react-vite'
import { UtxoTag } from '@/components/ui/jam/UtxoTag'
import { UTXO_STATUS_VARIANTS } from '@/lib/utxo'

const meta: Meta<typeof UtxoTag> = {
  title: 'Jam/UtxoTag',
  component: UtxoTag,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof UtxoTag>

export const All: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-8">
      {Object.entries(UTXO_STATUS_VARIANTS).map(([key, val]) => (
        <UtxoTag key={key} variant={val}>
          {key}
        </UtxoTag>
      ))}
    </div>
  ),
}
