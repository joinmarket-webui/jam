import type { Meta, StoryObj } from '@storybook/react-vite'
import { useTheme } from 'next-themes'
import { ThemeToggleButton } from '@/components/ui/jam/ThemeToggleButton'

const meta: Meta = {
  title: 'Jam/ThemeToggleButton',
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj

export const Default: Story = {
  render: () => {
    const { resolvedTheme, setTheme } = useTheme()
    const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

    return <ThemeToggleButton variant="default" theme={resolvedTheme ?? 'dark'} onClick={toggleTheme} />
  },
}
