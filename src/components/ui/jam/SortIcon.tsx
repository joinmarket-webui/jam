import type { Column } from '@tanstack/react-table'
import {
  ArrowUpDownIcon,
  SortDescIcon,
  SortAscIcon,
  ArrowUp01Icon,
  ArrowDown10Icon,
  ArrowDownZAIcon,
  ArrowUpAZIcon,
} from 'lucide-react'

interface SortIconProps {
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any, unknown>
}

export const SortIcon = ({ column, className }: SortIconProps) => {
  const direction = column.getIsSorted()
  if (!direction) {
    return <ArrowUpDownIcon className={className} />
  }

  const meta = column.columnDef.meta
  if (meta) {
    if ('numeric' in meta && meta.numeric === true) {
      return direction === 'desc' ? <ArrowDown10Icon className={className} /> : <ArrowUp01Icon className={className} />
    }
    if ('alphabetic' in meta && meta.alphabetic === true) {
      return direction === 'desc' ? <ArrowDownZAIcon className={className} /> : <ArrowUpAZIcon className={className} />
    }
  }

  return direction === 'desc' ? <SortDescIcon className={className} /> : <SortAscIcon className={className} />
}
