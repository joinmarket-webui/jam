import type { Meta, StoryObj } from '@storybook/react-vite'
import { SeedPhraseGrid } from '@/components/ui/jam/SeedPhraseGrid'
import { DUMMY_SEED_PHRASE } from '@/lib/utils'

const meta: Meta<typeof SeedPhraseGrid> = {
  title: 'Jam/SeedPhraseGrid',
  component: SeedPhraseGrid,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof SeedPhraseGrid>

export const Default: Story = {
  render: () => <SeedPhraseGrid value={DUMMY_SEED_PHRASE} masked={true} />,
}

export const Revealed: Story = {
  render: () => <SeedPhraseGrid value={DUMMY_SEED_PHRASE} masked={false} />,
}

export const Responsive: Story = {
  render: () => (
    <SeedPhraseGrid className="grid-cols-1 sm:grid-cols-2 md:grid-cols-3" value={DUMMY_SEED_PHRASE} masked={false} />
  ),
}
