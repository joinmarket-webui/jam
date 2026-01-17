import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="pagination-content" className={cn('flex flex-row items-center gap-1', className)} {...props} />
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'button'>

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      size={size}
      variant={isActive ? 'outline' : 'ghost'}
      className={className}
      {...props}
    />
  )
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation()
  return (
    <PaginationLink
      aria-label={t('global.table.pagination.page_selector.label_previous')}
      title={t('global.table.pagination.page_selector.label_previous')}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{t('global.table.pagination.page_selector.label_previous')}</span>
    </PaginationLink>
  )
}

function PaginationFirst({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation()
  return (
    <PaginationLink
      aria-label={t('global.table.pagination.page_selector.label_first')}
      title={t('global.table.pagination.page_selector.label_first')}
      size="default"
      className={cn('gap-1 px-2.5 md:pr-2.5', className)}
      {...props}
    >
      <ChevronsLeftIcon />
      <span className="hidden md:block">{t('global.table.pagination.page_selector.label_first')}</span>
    </PaginationLink>
  )
}

function PaginationLast({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation()
  return (
    <PaginationLink
      aria-label={t('global.table.pagination.page_selector.label_last')}
      title={t('global.table.pagination.page_selector.label_last')}
      size="default"
      className={cn('gap-1 px-2.5 md:pr-2.5', className)}
      {...props}
    >
      <span className="hidden md:block">{t('global.table.pagination.page_selector.label_last')}</span>
      <ChevronsRightIcon />
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const { t } = useTranslation()
  return (
    <PaginationLink
      aria-label={t('global.table.pagination.page_selector.label_next')}
      title={t('global.table.pagination.page_selector.label_next')}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{t('global.table.pagination.page_selector.label_next')}</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationFirst,
  PaginationLast,
}
