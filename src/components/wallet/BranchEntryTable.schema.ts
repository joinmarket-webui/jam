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
import type { AccountBranch } from '@/context/JamWalletInfoContext'
import type { UtxoTag } from '@/lib/tags'
import type { AmountSats, BitcoinAddress, HdPath } from '@/types/global'

export type BranchEntryApiObject = NonNullable<AccountBranch['__raw']['entries']>[number]

export type BranchEntryTableRow = BranchEntryApiObject & {
  derivationIndex: number
  derivationPath: HdPath
  address: BitcoinAddress
  balance: AmountSats
  tags: UtxoTag[]
}

export const branchEntryTableFeatures = tableFeatures({
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
