import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowPinningFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table'
import type { Badge } from '@/components/ui/badge'
import type { AmountSats } from '@/types/global'

export interface OrderTableEntry {
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  orderId: string // example: "0" (not unique!)
  type: {
    value: string // original value, example: 'sw0reloffer', 'swreloffer', 'reloffer', 'sw0absoffer', 'swabsoffer', 'absoffer'
    displayValue: string // example: "absolute" or "relative" (respecting i18n)
    badgeColor: Parameters<typeof Badge>[0]['variant']
    tooltip?: 'Native SW Absolute Fee' | 'Native SW Relative Fee' | string
    isAbsolute: boolean
    isRelative: boolean
  }
  fee: {
    value: number
    displayValue: string // example: "250" (abs offers) or "0.000100%" (rel offers)
  }
  minerFeeContribution: string // example: "0"
  minimumSize: string // example: "27300"
  maximumSize: string // example: "237499972700"
  bondValue: {
    value: number
    displayValue: string // example: "0" (no fb) or "114557102085.28133"
    locktime?: number
    displayLocktime?: string
    displayExpiresIn?: string
    amount?: AmountSats
  }
}

export const orderbookTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowPinningFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})
