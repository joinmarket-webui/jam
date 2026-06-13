import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { JarUtxosTable, type UtxoTableEntry } from './JarUtxosTable'

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

vi.mock('../ui/jam/Balance', () => ({
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
  tags: [{ displayValue: 'used', value: 'used', variant: 'used' }],
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
  tags: [{ displayValue: 'bond', value: 'bond', variant: 'fidelity-bond' }],
}

describe('JarUtxosTable', () => {
  beforeEach(() => {
    mocks.toastDismiss.mockReset()
    mocks.toastWarning.mockReset()
  })

  it('renders UTXO rows, sorting, tags, and expanded details', async () => {
    const user = userEvent.setup()
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

    await user.click(screen.getByText('jar_details.utxo_list.column_title_balance'))
    expect(screen.getAllByText('20000')[0]).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'jar_details.utxo_list.row_button_details' })[0])
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
    expect(message).toBe('Security measure: Selection changed')
    expect(options.description).toContain('Automatically selected 1 more UTXOs')
  })

  it('supports disabled selection and empty pagination state', () => {
    render(<JarUtxosTable tableEntries={[]} pinnedEntries={[]} enableRowSelection={false} />)

    expect(screen.getByText('global.table.pagination.items_per_page.label')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeDisabled()
  })
})
