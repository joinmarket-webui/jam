import type { Meta, StoryObj } from '@storybook/react-vite'
import { SliderWithInput } from '@/components/ui/jam/SliderWithInput'

/**
 * A single-thumb slider paired with a companion numeric input, letting users
 * type an exact value instead of dragging. Keeps the base `Core/Slider` a clean
 * Radix wrapper.
 */
const meta = {
  title: 'Jam/SliderWithInput',
  component: SliderWithInput,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    defaultValue: [33],
    min: 0,
    max: 100,
    step: 1,
  },
} satisfies Meta<typeof SliderWithInput>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * With a `step`, typed values snap to the nearest step and clamp to `min`/`max`.
 */
export const Stepped: Story = {
  args: {
    defaultValue: [50],
    min: 0,
    max: 100,
    step: 5,
  },
}
