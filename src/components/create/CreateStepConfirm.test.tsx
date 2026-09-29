import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import type { MnemonicPhrase } from '@/types/global'
import { CreateStepConfirm } from './CreateStepConfirm'

// Radix components (e.g. Switch) rely on ResizeObserver, which jsdom does not implement.
vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const mnemonicPhrase: MnemonicPhrase = ['alpha', 'bravo', 'charlie', 'delta']
const walletFileName = 'test_wallet.jmdat'
const password = 'correct-horse-battery-staple'

const renderConfirm = ({
  createdAt,
  blockHeight,
  onConfirm = vi.fn().mockResolvedValue(undefined),
}: {
  createdAt?: Date
  blockHeight?: number
  onConfirm?: () => Promise<void>
} = {}) => {
  render(
    <CreateStepConfirm
      walletFileName={walletFileName}
      password={password}
      mnemonicPhrase={mnemonicPhrase}
      createdAt={createdAt}
      blockHeight={blockHeight}
      onConfirm={onConfirm}
    />,
  )

  return { onConfirm }
}

describe('<CreateStepConfirm />', () => {
  it('renders wallet details and masked seed phrase without birthday when createdAt is undefined', () => {
    renderConfirm()

    expect(screen.getByText(walletFileName)).toBeInTheDocument()
    expect(screen.queryByText('Wallet Birthday')).not.toBeInTheDocument()
    expect(screen.getByText('Seed Phrase')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument()
  })

  it('renders birthday when createdAt is provided', () => {
    const fixedDate = new Date('2024-05-15T12:00:00Z')
    renderConfirm({ createdAt: fixedDate })

    const expectedDate = fixedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    })

    expect(screen.getByText('Wallet Birthday')).toBeInTheDocument()
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
    expect(
      screen.getByText("Note down the wallet's birthday with your backup seed for easy recovery."),
    ).toBeInTheDocument()
  })

  it('renders explicit creation date and block height when provided', () => {
    const fixedDate = new Date('2024-05-15T12:00:00Z')
    renderConfirm({ createdAt: fixedDate, blockHeight: 840_000 })

    const expectedDate = fixedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    })

    expect(screen.getByText(expectedDate)).toBeInTheDocument()
    expect(screen.getByText('(Block #840,000)')).toBeInTheDocument()
  })

  it('handles genesis block (block 0) correctly', () => {
    const genesisDate = new Date('2009-01-03T18:15:05Z')
    renderConfirm({ createdAt: genesisDate, blockHeight: 0 })

    expect(screen.getByText('(Block #0)')).toBeInTheDocument()
  })

  it('toggles sensitive info and enables backup confirmation to proceed', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderConfirm()

    const revealSwitch = screen.getByRole('switch', { name: /Reveal sensitive information/i })
    const confirmBackupSwitch = screen.getByRole('switch', { name: /written down the information above/i })
    const nextButton = screen.getByRole('button', { name: /Next/i })

    // Backup confirmation switch is disabled until reveal switch is touched
    expect(confirmBackupSwitch).toBeDisabled()

    // Reveal sensitive info
    await user.click(revealSwitch)
    expect(confirmBackupSwitch).toBeEnabled()

    // Confirm backup
    await user.click(confirmBackupSwitch)
    await user.click(nextButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  it('prevents submission if backup switch is not checked', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderConfirm()

    const nextButton = screen.getByRole('button', { name: /Next/i })
    await user.click(nextButton)

    expect(onConfirm).not.toHaveBeenCalled()
  })
})
