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
    const totalItems = 183
    const totalPages = itemsPerPage === -1 ? 1 : Math.max(1, Math.ceil(totalItems / itemsPerPage))

    return (
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage)
          setCurrentPage(1)
        }}
      />
    )
  },
}
