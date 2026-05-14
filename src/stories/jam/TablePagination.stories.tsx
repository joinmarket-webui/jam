import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TablePagination } from '@/components/ui/jam/TablePagination'

const meta: Meta<typeof TablePagination> = {
  title: 'Jam/TablePagination',
  component: TablePagination,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof TablePagination>

export const Default: Story = {
  args: {
    currentPage: 2,
    totalPages: 8,
    itemsPerPage: 25,
    totalItems: 183,
    onPageChange: () => undefined,
    onItemsPerPageChange: () => undefined,
  },
}

export const Empty: Story = {
  args: {
    ...Default.args,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  },
}

export const Interactive: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)

    return (
      <TablePagination
        currentPage={currentPage}
        totalPages={8}
        itemsPerPage={itemsPerPage}
        totalItems={183}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage)
          setCurrentPage(1)
        }}
      />
    )
  },
}
