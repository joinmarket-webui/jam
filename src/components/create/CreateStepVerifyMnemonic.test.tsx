import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import type { MnemonicPhrase } from '@/types/global'
import { CreateStepVerifyMnemonic } from './CreateStepVerifyMnemonic'

const mnemonicPhrase: MnemonicPhrase = ['alpha', 'bravo', 'charlie']

const renderVerifyMnemonic = ({
  onVerified = vi.fn().mockResolvedValue(undefined),
  onBack = vi.fn(),
}: {
  onVerified?: () => Promise<void>
  onBack?: () => void
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <CreateStepVerifyMnemonic mnemonicPhrase={mnemonicPhrase} onVerified={onVerified} onBack={onBack} />
    </QueryClientProvider>,
  )

  return { onVerified, onBack }
}

describe('<CreateStepVerifyMnemonic />', () => {
  it('verifies the seed phrase after words are selected in order', async () => {
    const { onVerified } = renderVerifyMnemonic()

    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fund Wallet' })).toBeDisabled()

    for (const word of mnemonicPhrase) {
      await userEvent.click(screen.getByRole('button', { name: word }))
    }

    expect(screen.getByText('Mnemonic phrase confirmed.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fund Wallet' }))

    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
  })

  it('keeps the user on the step after a wrong word and supports going back', async () => {
    const { onBack } = renderVerifyMnemonic()

    await userEvent.click(screen.getByRole('button', { name: 'bravo' }))

    expect(screen.getByRole('button', { name: 'Fund Wallet' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Back/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
