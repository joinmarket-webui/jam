import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'
import { JarUtxosTable } from '../wallet/JarUtxosTable'

export type UtxoSelectionDialogProps = {
  open: boolean
  isSubmitting: boolean
  selectedCount: number
  filter: string
  onOpenChange: (open: boolean) => void
  onFilterChange: (value: string) => void
  onSubmit: () => Promise<void>
} & Pick<
  ComponentProps<typeof JarUtxosTable>,
  'tableEntries' | 'initialRowSelection' | 'enableRowSelection' | 'onRowSelectionChange'
>

export const UtxoSelectionDialog = ({
  open,
  isSubmitting,
  selectedCount,
  filter,
  tableEntries,
  initialRowSelection,
  enableRowSelection,
  onOpenChange,
  onFilterChange,
  onRowSelectionChange,
  onSubmit,
}: UtxoSelectionDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-6xl flex-col overflow-hidden">
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit()
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t('show_utxos.title')}</DialogTitle>
            <DialogDescription>
              {t('show_utxos.subtitle', { count: selectedCount })} {t('show_utxos.text_subtitle_addon')}
            </DialogDescription>
          </DialogHeader>

          <Input
            className="shrink-0"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder={t('jar_details.utxo_list.placeholder_search')}
            disabled={isSubmitting}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <JarUtxosTable
              globalFilter={filter}
              tableEntries={tableEntries}
              pinnedEntries={[]}
              initialRowSelection={initialRowSelection}
              onRowSelectionChange={onRowSelectionChange}
              enableRowSelection={enableRowSelection}
            />
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t('modal.confirm_button_reject')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : undefined}
              {t('modal.confirm_button_accept')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
