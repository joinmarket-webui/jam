import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { BALANCE_SUMMARY_EMPTY } from '@/lib/balanceSummary'
import { CreateFidelityBondDialog } from './CreateFidelityBondDialog'

const h = vi.hoisted(() => ({
  freezeCalls: [] as Array<{ 'utxo-string': string; freeze: boolean }>,
  unfreezeFailure: null as Error | null,
  pendingUnfreezePromise: null as Promise<unknown> | null,
  walletJars: [] as Jar[],
  refetchWallet: vi.fn().mockResolvedValue(undefined),
  toastError: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: 'en', language: 'en' },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: h.toastError,
  },
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: vi.fn((options: { url: string }) => {
      if (options.url.includes('/address/timelock/new/')) {
        return Promise.resolve({ data: { address: 'bcrt1qtimelockdestination' } })
      }
      return Promise.resolve({ data: {} })
    }),
    post: vi.fn(async (options: { url: string; body: { 'utxo-string': string; freeze: boolean } }) => {
      if (options.url.endsWith('/freeze')) {
        h.freezeCalls.push(options.body)
        if (!options.body.freeze) {
          if (h.pendingUnfreezePromise) {
            await h.pendingUnfreezePromise
          }
          if (h.unfreezeFailure) {
            throw h.unfreezeFailure
          }
        }
        return { data: {} }
      }
      if (options.url.endsWith('/direct-send')) {
        return { data: { txinfo: { txid: 'created-tx' } } }
      }
      return { data: {} }
    }),
    getConfig: () => ({ baseUrl: 'http://localhost:3000' }),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: h.walletJars,
    fidelityBondSummary: { fbOutputs: [] },
    addressSummary: { bcrt1qsource: { status: 'cj-out' } },
    refetch: h.refetchWallet,
  }),
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({
    currency: 'sats',
    isPrivate: false,
    addressChunkingEnabled: false,
    hiddenAmountPlaceholder: '*****',
  }),
}))

vi.mock('../fidelity-bond/LockdateSelect', async () => {
  const { generateLockdateOptions } = await import('./types')
  return {
    LockdateSelect: ({ onChange }: { onChange: (lockdate: string) => void }) => (
      <button onClick={() => onChange(generateLockdateOptions(false)[0].value)}>select-lockdate</button>
    ),
  }
})

const utxo = (overrides: Partial<Utxo>): Utxo => ({
  utxo: 'tx:0',
  address: 'bcrt1qsource',
  path: "m/84'/1'/0'/0/0",
  label: '',
  value: 100_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 6,
  frozen: false,
  locktime: undefined,
  ...overrides,
})

const unfreezeCalls = () => h.freezeCalls.filter((it) => !it.freeze).map((it) => it['utxo-string'])

function TestDialog() {
  const [open, setOpen] = useState(true)
  return <CreateFidelityBondDialog open={open} onOpenChange={setOpen} walletFileName="wallet.jmdat" />
}

const renderAtReview = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TestDialog />
    </QueryClientProvider>,
  )

  await userEvent.click(screen.getByText('select-lockdate'))
  await userEvent.click(screen.getByRole('button', { name: 'global.next' }))
  await userEvent.click(await screen.findByText('large:0'))
  await userEvent.click(screen.getByRole('button', { name: 'global.next' }))
  await userEvent.click(
    await screen.findByRole('button', { name: 'earn.fidelity_bond.freeze_utxos.text_primary_button' }),
  )
  await screen.findByRole('button', { name: 'earn.fidelity_bond.review_inputs.text_primary_button' })

  expect(h.freezeCalls).toEqual([{ 'utxo-string': 'small:0', freeze: true }])
}

describe('CreateFidelityBondDialog (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.freezeCalls = []
    h.unfreezeFailure = null
    h.pendingUnfreezePromise = null
    h.walletJars = [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#808080',
        balanceSummary: BALANCE_SUMMARY_EMPTY,
        utxos: [utxo({ utxo: 'small:0', value: 10_000 }), utxo({ utxo: 'large:0', value: 50_000 })],
      } as unknown as Jar,
    ]
  })

  it.each([
    ['the cancel button', () => userEvent.click(screen.getByRole('button', { name: 'global.cancel' }))],
    ['the close button', () => userEvent.click(screen.getByRole('button', { name: 'global.close' }))],
    ['escape', () => userEvent.keyboard('{Escape}')],
  ])('unfreezes the utxos frozen for the bond when closed via %s', async (_, close) => {
    await renderAtReview()

    await close()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(unfreezeCalls()).toEqual(['small:0'])
    expect(h.toastError).not.toHaveBeenCalled()
  })

  it('stays open and ignores further close requests until the utxos are unfrozen', async () => {
    await renderAtReview()
    let resolveUnfreeze: ((value: unknown) => void) | undefined
    h.pendingUnfreezePromise = new Promise((resolve) => {
      resolveUnfreeze = resolve
    })

    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'global.close' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'global.cancel' })).toBeDisabled()
    expect(unfreezeCalls()).toEqual(['small:0'])

    resolveUnfreeze?.(undefined)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(unfreezeCalls()).toEqual(['small:0'])
  })

  it('closes and reports the utxos that could not be unfrozen', async () => {
    await renderAtReview()
    h.unfreezeFailure = new Error('unfreeze failed')

    await userEvent.click(screen.getByRole('button', { name: 'global.cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(h.toastError).toHaveBeenCalledWith('earn.fidelity_bond.create_fidelity_bond.error_unfreezing_utxos_on_close')
  })

  it('unfreezes the utxos frozen for the bond when going back to the utxo selection', async () => {
    await renderAtReview()

    await userEvent.click(screen.getByRole('button', { name: 'global.back' }))
    await screen.findByRole('button', { name: 'earn.fidelity_bond.freeze_utxos.text_primary_button' })
    expect(unfreezeCalls()).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'global.back' }))

    await screen.findByText('large:0')
    expect(unfreezeCalls()).toEqual(['small:0'])
  })

  it('does not offer to unfreeze the utxos again after the bond was created', async () => {
    await renderAtReview()

    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'earn.fidelity_bond.review_inputs.text_primary_button' }))

    const doneButton = await screen.findByRole('button', { name: 'global.done' }, { timeout: 5000 })
    expect(unfreezeCalls()).toEqual(['small:0'])
    expect(
      screen.queryByRole('button', { name: 'earn.fidelity_bond.create_fidelity_bond.text_primary_button_unfreeze' }),
    ).not.toBeInTheDocument()

    await userEvent.click(doneButton)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(unfreezeCalls()).toEqual(['small:0'])
  })
})
