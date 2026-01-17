import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZES = [25, 50, 100]
const DEFAULT_ALLOW_SHOW_ALL = true

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  pageSizes?: number[]
  allowShowAll?: boolean
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  className?: string
}

const TablePagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  className,
  pageSizes = DEFAULT_PAGE_SIZES,
  allowShowAll = DEFAULT_ALLOW_SHOW_ALL,
}: TablePaginationProps) => {
  const { t } = useTranslation()
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const isShowingAll = itemsPerPage === -1
  const startItem = isShowingAll ? 1 : (currentPage - 1) * itemsPerPage + 1
  const endItem = isShowingAll ? totalItems : Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-2 py-4 sm:flex-row sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground text-sm text-nowrap">
          {t('global.table.pagination.items_per_page.label')}
        </Label>
        <Select value={String(itemsPerPage)} onValueChange={(it) => onItemsPerPageChange(parseInt(it, 10))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('global.table.pagination.items_per_page.label')} />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
            {allowShowAll && (
              <SelectItem value={String(-1)}>
                {t('global.table.pagination.items_per_page.text_option_show_all')}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {totalItems > 0 ? (
          <div className="hidden text-sm font-medium text-nowrap sm:block">
            {`${startItem}-${endItem} of ${totalItems}`}
          </div>
        ) : undefined}

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationFirst onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
            </PaginationItem>
            <PaginationItem>
              <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage - 1 < 1} />
            </PaginationItem>
            {[currentPage, currentPage - 1, currentPage + 1, currentPage - 2, currentPage + 2]
              .filter((it) => it >= 1 && it <= totalPages)
              .sort()
              .slice(0, 3)
              .map((it, index) => (
                <PaginationItem key={index}>
                  <PaginationLink isActive={it === currentPage} onClick={() => handlePageChange(it)}>
                    {it}
                  </PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage + 1 > totalPages}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLast onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export { TablePagination }
