import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Column } from '@tanstack/react-table'
import { SortIcon } from '@/components/ui/jam/SortIcon'

type SortDirection = false | 'asc' | 'desc'

const createColumn = (direction: SortDirection, meta?: Record<string, boolean>) =>
  ({
    getIsSorted: () => direction,
    columnDef: {
      meta,
    },
  }) as Column<unknown, unknown>

const meta: Meta<typeof SortIcon> = {
  title: 'Jam/SortIcon',
  component: SortIcon,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof SortIcon>

export const Unsorted: Story = {
  args: {
    column: createColumn(false),
    className: 'size-5',
  },
}

export const GenericAscending: Story = {
  args: {
    column: createColumn('asc'),
    className: 'size-5',
  },
}

export const NumericDescending: Story = {
  args: {
    column: createColumn('desc', { numeric: true }),
    className: 'size-5',
  },
}

export const AlphabeticAscending: Story = {
  args: {
    column: createColumn('asc', { alphabetic: true }),
    className: 'size-5',
  },
}

export const All: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <SortIcon column={createColumn(false)} className="size-5" />
      <SortIcon column={createColumn('asc')} className="size-5" />
      <SortIcon column={createColumn('desc')} className="size-5" />
      <SortIcon column={createColumn('asc', { numeric: true })} className="size-5" />
      <SortIcon column={createColumn('desc', { alphabetic: true })} className="size-5" />
    </div>
  ),
}
