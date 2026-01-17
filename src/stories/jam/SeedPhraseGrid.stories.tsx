import type { Meta, StoryObj } from '@storybook/react-vite'
import { SeedPhraseGrid } from '@/components/ui/jam/SeedPhraseGrid'

const meta: Meta<typeof SeedPhraseGrid> = {
  title: 'Jam/SeedPhraseGrid',
  component: SeedPhraseGrid,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof SeedPhraseGrid>

const DUMMY_SEED_PHRASE: string[] =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(/\s+/)

export const Default: Story = {
  render: () => <SeedPhraseGrid value={DUMMY_SEED_PHRASE} blurred={true} />,
}

export const Revealed: Story = {
  render: () => <SeedPhraseGrid value={DUMMY_SEED_PHRASE} blurred={false} />,
}
