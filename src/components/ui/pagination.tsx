import { ChevronLeft, ChevronRight, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  className?: string
}

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  className,
}: PaginationProps) => {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onItemsPerPageChange(parseInt(e.target.value, 10))
  }

  const isShowingAll = itemsPerPage === -1
  const startItem = isShowingAll ? 1 : (currentPage - 1) * itemsPerPage + 1
  const endItem = isShowingAll ? totalItems : Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className={cn('flex items-center justify-between px-2 py-4', className)}>
      <div className="text-muted-foreground flex items-center space-x-2 text-sm">
        <span>Items per page</span>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="border-input bg-background rounded border px-2 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={-1}>All</option>
        </select>
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="text-sm font-medium">
          {totalItems > 0 ? `${startItem}-${endItem} of ${totalItems}` : '0-0 of 0'}
        </div>

        {!isShowingAll && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="hidden lg:flex"
            >
              <ChevronsLeftIcon />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft />
            </Button>

            <div className="flex items-center justify-center text-sm font-medium">{currentPage}</div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="hidden lg:flex"
            >
              <ChevronsRightIcon />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export { Pagination }
