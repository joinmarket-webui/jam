import type { RowSelectionState } from '@tanstack/react-table'
import * as yup from 'yup'

export type UtxoSelectionFormValues = {
  filter: string
  rowSelection: RowSelectionState
}

export const UTXO_SELECTION_FORM_DEFAULT_VALUES: UtxoSelectionFormValues = {
  filter: '',
  rowSelection: {},
}

export const createUtxoSelectionFormSchema = (
  selectableUtxoIds: string[],
): yup.ObjectSchema<UtxoSelectionFormValues> => {
  const selectableUtxoIdSet = new Set(selectableUtxoIds)

  return yup
    .object({
      filter: yup.string().defined(),
      rowSelection: yup
        .mixed<RowSelectionState>()
        .defined()
        .test('selectable-utxos', (value) =>
          Object.entries(value).every(
            ([utxoId, selected]) => typeof selected === 'boolean' && (!selected || selectableUtxoIdSet.has(utxoId)),
          ),
        ),
    })
    .required()
}
