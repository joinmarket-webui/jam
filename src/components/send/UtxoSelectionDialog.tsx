import type { OnChangeFn, Row, RowSelectionState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'
import { JarUtxosTable, type UtxoTableEntry } from '../wallet/JarUtxosTable'

export interface UtxoSelectionDialogProps {
  open: boolean
  isApplying: boolean
  selectedCount: number
  filter: string
  tableEntries: UtxoTableEntry[]
  initialRowSelection: RowSelectionState
  enableRowSelection: boolean | ((row: Row<UtxoTableEntry>) => boolean)
  onOpenChange: (open: boolean) => void
  onFilterChange: (value: string) => void
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onApply: () => void
}

export const UtxoSelectionDialog = ({
  open,
  isApplying,
  selectedCount,
  filter,
  tableEntries,
  initialRowSelection,
  enableRowSelection,
  onOpenChange,
  onFilterChange,
  onRowSelectionChange,
  onApply,
}: UtxoSelectionDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t('show_utxos.title')}</DialogTitle>
          <DialogDescription>
            {t('show_utxos.subtitle', { count: selectedCount })} {t('show_utxos.text_subtitle_addon')}
          </DialogDescription>
        </DialogHeader>

        <Input
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder={t('jar_details.utxo_list.placeholder_search')}
        />
        <div className="max-h-[55vh] overflow-hidden">
          <JarUtxosTable
            globalFilter={filter}
            tableEntries={tableEntries}
            pinnedEntries={[]}
            initialRowSelection={initialRowSelection}
            onRowSelectionChange={onRowSelectionChange}
            enableRowSelection={enableRowSelection}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button type="button" onClick={onApply} disabled={isApplying}>
            {isApplying ? <Spinner /> : undefined}
            {t('modal.confirm_button_accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
