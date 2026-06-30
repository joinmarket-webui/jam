import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AccountMeta } from '@/context/JamWalletInfoContext'
import { AccountDetailsTabContent } from './AccountDetailsTabContent'

const h = vi.hoisted(() => ({ tableProps: [] as Array<{ tableEntries: unknown[] }> }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../ui/accordion', () => ({
  Accordion: ({ children, defaultValue }: { children?: ReactNode; defaultValue?: string[] }) => (
    <div data-testid="accordion" data-default={JSON.stringify(defaultValue)}>
      {children}
    </div>
  ),
  AccordionItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/tags', () => ({ statusTags: (status: string) => (status ? [status] : []) }))

vi.mock('./BranchEntryTable', () => ({
  BranchEntryTable: ({ tableEntries }: { tableEntries: unknown[] }) => {
    h.tableProps.push({ tableEntries })
    return <div data-testid="branch-table">{tableEntries.length}</div>
  },
}))

const makeBranch = (type: string, entries?: Array<Record<string, unknown>>) => ({
  type,
  derivation: "m/84'/0'/0'/0",
  __raw: { entries },
})

const makeAccount = (branches: ReturnType<typeof makeBranch>[]): AccountMeta => ({ branches }) as unknown as AccountMeta

describe('AccountDetailsTabContent', () => {
  it('renders external and internal branch headings and skips empty branches', () => {
    const account = makeAccount([
      makeBranch('external addresses', [
        { hd_path: "m/84'/0'/0'/0/3", address: 'bc1a', amount: '0.5', status: 'used' },
      ]),
      makeBranch('internal addresses', [{ hd_path: "m/84'/0'/0'/1/0", address: 'bc1b', amount: '0', status: '' }]),
      makeBranch('external addresses', []),
    ])
    render(<AccountDetailsTabContent value={account} />)

    expect(screen.getByText('current_wallet.account_heading_external_addresses')).toBeInTheDocument()
    expect(screen.getByText('current_wallet.account_heading_internal_addresses')).toBeInTheDocument()
    // empty branch is filtered out -> only two branch tables
    expect(screen.getAllByTestId('branch-table')).toHaveLength(2)
  })

  it('passes the unknown branch type through as the heading', () => {
    const account = makeAccount([
      makeBranch('mixdepth deposit', [{ hd_path: "m/84'/0'/0'/0/0", address: 'bc1c', amount: '1', status: 'new' }]),
    ])
    render(<AccountDetailsTabContent value={account} />)
    expect(screen.getByText('mixdepth deposit')).toBeInTheDocument()
  })

  it('sets the first non-empty branch as the default open accordion item', () => {
    const account = makeAccount([
      makeBranch('external addresses', []),
      makeBranch('internal addresses', [{ hd_path: "m/84'/0'/0'/1/0", address: 'bc1d', amount: '0', status: '' }]),
    ])
    render(<AccountDetailsTabContent value={account} />)
    // index 1 is the first displayed branch
    expect(screen.getByTestId('accordion')).toHaveAttribute('data-default', '["1"]')
  })

  it('renders an empty accordion when there are no branches', () => {
    render(<AccountDetailsTabContent value={makeAccount([])} />)
    expect(screen.getByTestId('accordion')).not.toHaveAttribute('data-default')
    expect(screen.queryByTestId('branch-table')).not.toBeInTheDocument()
  })

  it('maps hd_path with a colon and falls back for malformed values', () => {
    h.tableProps = []
    const account = makeAccount([
      makeBranch('external addresses', [
        { hd_path: 'm/84:1777593600', address: 'bc1e', amount: '0.1', status: 'used' },
        { hd_path: 'm/', address: 'bc1f', amount: '', status: '' },
      ]),
    ])
    render(<AccountDetailsTabContent value={account} />)
    const entries = h.tableProps.at(-1)?.tableEntries as Array<{ derivationIndex: number }>
    expect(entries).toHaveLength(2)
    expect(entries[0].derivationIndex).toBe(84)
    expect(entries[1].derivationIndex).toBe(-1)
  })
})
