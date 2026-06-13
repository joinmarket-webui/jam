import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BranchEntryTableRow } from './BranchEntryTable'
import { BranchEntryTable } from './BranchEntryTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

const makeEntry = (overrides: Partial<BranchEntryTableRow>): BranchEntryTableRow =>
  ({
    address: 'bc1qbranch-a',
    balance: 4_000,
    derivationIndex: 0,
    derivationPath: "m/84'/0'/0'/0/0",
    imported: false,
    labels: [],
    scripts: '',
    tags: [{ displayValue: 'new', value: 'new', variant: 'new' }],
    used: false,
    __raw: {},
    ...overrides,
  }) as BranchEntryTableRow

const firstEntry = makeEntry({
  address: 'bc1qbranch-a',
  balance: 4_000,
  derivationIndex: 0,
  tags: [{ displayValue: 'new', value: 'new', variant: 'new' }],
})

const secondEntry = makeEntry({
  address: 'bc1qbranch-b',
  balance: 9_000,
  derivationIndex: 1,
  tags: [{ displayValue: 'deposit', value: 'deposit', variant: 'deposit' }],
})

describe('BranchEntryTable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
  })

  it('renders branch entries, highlighted entries, and pinned entries', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <BranchEntryTable
        tableEntries={[firstEntry, secondEntry]}
        selectedEntries={[secondEntry]}
        pinnedEntries={[secondEntry]}
        onChange={onChange}
      />,
    )

    expect(screen.getByText('bc1qbranch-a')).toBeInTheDocument()
    expect(screen.getByText('bc1qbranch-b')).toBeInTheDocument()
    expect(screen.getByText('deposit')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()

    await user.click(screen.getByText('jar_details.utxo_list.column_title_balance'))

    expect(screen.getByText('9000')).toBeInTheDocument()
  })

  it('filters rows and renders the filtered pagination state', () => {
    render(
      <BranchEntryTable
        globalFilter="branch-b"
        tableEntries={[firstEntry, secondEntry]}
        selectedEntries={[]}
        pinnedEntries={[]}
      />,
    )

    expect(screen.queryByText('bc1qbranch-a')).not.toBeInTheDocument()
    expect(screen.getByText('bc1qbranch-b')).toBeInTheDocument()
    expect(screen.getByText('1-1 of 1')).toBeInTheDocument()
  })
})
