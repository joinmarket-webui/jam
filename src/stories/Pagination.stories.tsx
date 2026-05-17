import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination'

const meta: Meta<typeof Pagination> = {
  title: 'Core/Pagination',
  component: Pagination,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Pagination>

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink size="default">Previous</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink isActive>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink>2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink>3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink size="default">Next</PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}

export const Compact: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink aria-label="Previous page">{'<'}</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink isActive>4</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink aria-label="Next page">{'>'}</PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}
