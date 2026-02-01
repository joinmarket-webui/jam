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
  const dir = column.getIsSorted()
  if (!dir) {
    return <ArrowUpDownIcon className={className} />
  }

  const meta = column.columnDef.meta
  if (meta) {
    if ('numeric' in meta && meta.numeric === true) {
      return dir === 'desc' ? <ArrowDown10Icon className={className} /> : <ArrowUp01Icon className={className} />
    }
    if ('alphabetic' in meta && meta.alphabetic === true) {
      return dir === 'desc' ? <ArrowDownZAIcon className={className} /> : <ArrowUpAZIcon className={className} />
    }
  }

  return dir === 'desc' ? <SortDescIcon className={className} /> : <SortAscIcon className={className} />
}
