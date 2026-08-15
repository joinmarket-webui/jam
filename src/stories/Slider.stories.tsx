import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slider } from '@/components/ui/slider'

/**
 * An input where the user selects a value from within a given range.
 */
const meta = {
  title: 'Core/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {},
  args: {
    defaultValue: [33],
    max: 100,
    step: 1,
    minStepsBetweenThumbs: 0,
  },
} satisfies Meta<typeof Slider>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The default form of the slider.
 */
export const Default: Story = {}

/**
 * Use the `orientation` prop to render a vertical slider.
 */
export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    className: 'h-40',
  },
}

/**
 * Use the `inverted` prop to have the slider fill from right to left.
 */
export const Inverted: Story = {
  args: {
    inverted: true,
  },
}

/**
 * Use the `disabled` prop to disable the slider.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

/**
 * Use the `disabled` prop to disable the slider.
 */
export const Multiple: Story = {
  args: {
    defaultValue: [33, 66],
  },
}

/**
 * Use the `withInput` prop to render a companion numeric input next to the slider,
 * letting users type a value manually. Only available for single-thumb sliders.
 */
export const WithInput: Story = {
  args: {
    withInput: true,
  },
}
