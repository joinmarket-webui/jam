import { useMemo, useState } from 'react'
import type { RowModel } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { AccountBranch, AccountMeta } from '@/context/JamWalletInfoContext'
import { statusTags } from '@/lib/tags'
import { btcToSats, isValidNumber } from '@/lib/utils'
import type { HdPath } from '@/types/global'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { BranchEntryTable, type BranchEntryApiObject, type BranchEntryTableRow } from './BranchEntryTable'

const HIDE_EMPTY_BRANCHES = true

const toTypeHeading = (type: string, t: TFunction) => {
  if (type === 'external addresses') {
    return t('current_wallet.account_heading_external_addresses')
  } else if (type === 'internal addresses') {
    return t('current_wallet.account_heading_internal_addresses')
  }
  return type
}

const toLastHdPathIndex = (hdPath: HdPath): number | null => {
  const indexOfLastSeparator = hdPath.lastIndexOf('/')
  if (indexOfLastSeparator === -1 || indexOfLastSeparator === hdPath.length - 1) {
    return null
  }

  const stringValue = hdPath.substring(indexOfLastSeparator + 1, hdPath.length)
  const indexOfFirstColon = stringValue.indexOf(':') // value can be `/76:1777593600`

  const sanitizedStringValue = indexOfFirstColon === -1 ? stringValue : stringValue.substring(0, indexOfFirstColon)
  const numberValue = parseInt(sanitizedStringValue, 10)
  return !isValidNumber(numberValue) ? null : numberValue
}

const branchToTableEntry = (value: BranchEntryApiObject): BranchEntryTableRow => {
  return {
    ...value,
    derivationIndex: toLastHdPathIndex(value.hd_path as HdPath) ?? -1,
    derivationPath: (value.hd_path !== undefined ? value.hd_path : 'm/-1') as HdPath,
    address: value.address || '',
    balance: btcToSats(value.amount || '0'),
    tags: statusTags(value.status || ''),
  }
}

interface BranchAccordionContentProps {
  value: AccountBranch
}

const BranchAccordionContent = ({ value }: BranchAccordionContentProps) => {
  const [_tableRowModel, setTableRowModel] = useState<RowModel<BranchEntryTableRow>>()

  const tableEntries = useMemo(() => {
    return (value.__raw.entries || []).map((it) => branchToTableEntry(it))
  }, [value])

  return (
    <BranchEntryTable
      tableEntries={tableEntries}
      selectedEntries={[]}
      pinnedEntries={[]}
      globalFilter={''}
      onChange={(table) => {
        setTableRowModel(table.getFilteredRowModel())
      }}
    />
  )
}

interface AccountDetailsTabContentProps {
  value: AccountMeta
}

export const AccountDetailsTabContent = ({ value }: AccountDetailsTabContentProps) => {
  const { t } = useTranslation()

  const displayBranches = (value.branches || [])
    .map((it, index) => ({
      branch: it,
      index,
    }))
    .filter(({ branch }) =>
      !HIDE_EMPTY_BRANCHES ? true : branch.__raw.entries !== undefined && branch.__raw.entries.length > 0,
    )

  const defaultValue = displayBranches.length > 0 ? [String(displayBranches[0].index)] : undefined

  return (
    <Accordion type="multiple" className="bg-card w-full rounded-lg" defaultValue={defaultValue}>
      {displayBranches.map(({ branch, index }) => {
        const typeTitle = toTypeHeading(branch.type, t)
        return (
          <AccordionItem key={index} value={String(index)}>
            <AccordionTrigger className="group/account-branch-accordion-trigger items-center px-4 no-underline!">
              <div className="flex flex-col gap-0.25">
                <span className="group-hover/account-branch-accordion-trigger:underline">{typeTitle}</span>
                <span className="text-muted-foreground font-mono select-all">{branch.derivation}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-2">
              <BranchAccordionContent value={branch} />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
