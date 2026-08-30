import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { JarUtxosTable } from './JarUtxosTable'
import type { UtxoTableEntry } from './JarUtxosTable.schema'

const mocks = vi.hoisted(() => ({
  toastDismiss: vi.fn(),
  toastWarning: vi.fn<(message: string, options: { description: string }) => void>(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    dismiss: mocks.toastDismiss,
    warning: mocks.toastWarning,
  },
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

const makeUtxo = (overrides: Partial<Utxo>): Utxo =>
  ({
    address: 'bc1qaddress-a',
    confirmations: 5,
    frozen: false,
    label: '',
    locktime: undefined,
    tries_remaining: 3,
    utxo: 'txid-a:0',
    value: 10_000,
    ...overrides,
  }) as Utxo

const firstEntry: UtxoTableEntry = {
  utxo: makeUtxo({ address: 'bc1qshared', label: 'cold', utxo: 'txid-a:0', value: 10_000 }),
  tags: [{ displayValue: 'used', value: 'used', variant: 'reused' }],
}

const secondEntry: UtxoTableEntry = {
  utxo: makeUtxo({ address: 'bc1qshared', confirmations: 2, utxo: 'txid-b:1', value: 5_000 }),
  tags: [{ displayValue: 'frozen', value: 'frozen', variant: 'frozen' }],
}

const frozenEntry: UtxoTableEntry = {
  utxo: makeUtxo({
    address: 'bc1qfrozen',
    confirmations: 7,
    frozen: true,
    utxo: 'txid-c:2',
    value: 20_000,
  }),
  tags: [{ displayValue: 'bond', value: 'bond', variant: 'bond' }],
}

const findFirstDataRowCheckbox = () => {
  const firstDataRow = screen.getAllByRole('row').find((row) => within(row).queryByText('10000'))!
  return within(firstDataRow).getByRole('checkbox')
}

describe('JarUtxosTable', () => {
  beforeEach(() => {
    mocks.toastDismiss.mockReset()
    mocks.toastWarning.mockReset()
  })

  it('renders UTXO rows, sorting, tags, and expanded details', () => {
    const onChange = vi.fn()

    render(
      <JarUtxosTable
        tableEntries={[firstEntry, secondEntry, frozenEntry]}
        pinnedEntries={[frozenEntry]}
        onChange={onChange}
      />,
    )

    expect(screen.getAllByText('bc1qshared')).toHaveLength(2)
    expect(screen.getByText('bc1qfrozen')).toBeInTheDocument()
    expect(screen.getByText('used')).toBeInTheDocument()
    expect(screen.getByText('bond')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()

    fireEvent.click(screen.getByText('jar_details.utxo_list.column_title_balance'))
    expect(screen.getAllByText('20000')[0]).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'jar_details.utxo_list.row_button_details' })[0])
    expect(screen.getByText(/"utxo": "txid-c:2"/u)).toBeInTheDocument()
  })

  it('selects related UTXOs from the same address and reports selection changes', async () => {
    const user = userEvent.setup()
    const onRowSelectionChange = vi.fn()

    render(
      <JarUtxosTable
        tableEntries={[firstEntry, secondEntry]}
        pinnedEntries={[]}
        onRowSelectionChange={onRowSelectionChange}
      />,
    )

    const rows = screen.getAllByRole('row')
    const firstDataRow = rows.find((row) => within(row).queryByText('10000'))!
    await user.click(within(firstDataRow).getByRole('checkbox'))

    await waitFor(() => expect(onRowSelectionChange).toHaveBeenCalled())
    expect(mocks.toastWarning).toHaveBeenCalledOnce()
    const [message, options] = mocks.toastWarning.mock.calls[0]
    expect(message).toBe('jar_details.utxo_list.toast_auto_selection_title')
    expect(options.description).toContain('jar_details.utxo_list.toast_auto_selected_with_address')
  })

  it('supports disabled selection and empty pagination state', () => {
    render(<JarUtxosTable tableEntries={[]} pinnedEntries={[]} enableRowSelection={false} />)

    expect(screen.getByText('global.table.pagination.items_per_page.label')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeDisabled()
  })

  it('deselects related UTXOs from the same address', async () => {
    const user = userEvent.setup()
    render(<JarUtxosTable tableEntries={[firstEntry, secondEntry]} pinnedEntries={[]} />)

    await user.click(findFirstDataRowCheckbox()) // select (auto-selects the sibling)
    mocks.toastWarning.mockClear()
    await user.click(findFirstDataRowCheckbox()) // deselect both

    expect(mocks.toastWarning).toHaveBeenCalledOnce()
    const [, options] = mocks.toastWarning.mock.calls[0]
    expect(options.description).toContain('jar_details.utxo_list.toast_auto_deselected_with_address')
  })

  it('dismisses the toast for a single unique-address selection', async () => {
    const user = userEvent.setup()
    const uniqueEntry: UtxoTableEntry = {
      utxo: makeUtxo({ address: 'bc1qunique', utxo: 'txid-d:0', value: 7_000 }),
      tags: [],
    }
    render(<JarUtxosTable tableEntries={[firstEntry, secondEntry, uniqueEntry]} pinnedEntries={[]} />)

    const rows = screen.getAllByRole('row')
    const uniqueRow = rows.find((row) => within(row).queryByText('7000'))!
    await user.click(within(uniqueRow).getByRole('checkbox'))

    expect(mocks.toastWarning).not.toHaveBeenCalled()
    expect(mocks.toastDismiss).toHaveBeenCalled()
  })

  it('toggles all rows via the header checkbox', async () => {
    const user = userEvent.setup()
    render(<JarUtxosTable tableEntries={[firstEntry, secondEntry]} pinnedEntries={[]} />)

    const headerCheckbox = screen.getAllByRole('checkbox')[0]
    await user.click(headerCheckbox)

    expect(mocks.toastDismiss).toHaveBeenCalled()
  })

  it('sorts by the address and confirmations columns', () => {
    render(<JarUtxosTable tableEntries={[firstEntry, secondEntry, frozenEntry]} pinnedEntries={[]} />)

    fireEvent.click(screen.getByText('jar_details.utxo_list.column_title_address'))
    fireEvent.click(screen.getByText('jar_details.utxo_list.column_title_confirmations'))
    // toggle the balance column through its sort states
    const balanceHeader = screen.getByText('jar_details.utxo_list.column_title_balance')
    fireEvent.click(balanceHeader)
    fireEvent.click(balanceHeader)

    expect(screen.getByText('bc1qfrozen')).toBeInTheDocument()
  })
})
