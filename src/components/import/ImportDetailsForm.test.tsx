import type { ReactNode } from 'react'
import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DUMMY_SEED_PHRASE, pseudoRandomInteger } from '@/lib/utils'
import { flushActUpdates } from '@/test/flushActUpdates'
import { withRuntimeLocale } from '@/test/withRuntimeLocale'
import type { BlockHeight } from '@/types/global'
import { ImportDetailsForm } from './ImportDetailsForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('../ui/accordion', () => ({
  Accordion: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const VALID_MNEMONIC = DUMMY_SEED_PHRASE.join(' ')

const typeMnemonic = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('import_wallet.import_details.placeholder_mnemonic_phrase'), {
    target: { value },
  })
}

const typeBlockheight = (value: BlockHeight) => {
  fireEvent.change(screen.getByPlaceholderText('import_wallet.import_details.placeholder_blockheight'), {
    target: { value },
  })
}

const mockedSessionInfo: SessionResponse = { session: false, maker_running: false, coinjoin_in_process: false }

describe('ImportDetailsForm', () => {
  it('renders the mnemonic, blockheight and gaplimit fields', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} sessionInfo={mockedSessionInfo} />)
    expect(screen.getByText('import_wallet.import_details.label_mnemonic_phrase')).toBeInTheDocument()
    expect(document.querySelector('#blockheight')).toBeInTheDocument()
    expect(document.querySelector('#gaplimit')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('shows a success alert when the mnemonic is a valid BIP-39 phrase', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} sessionInfo={mockedSessionInfo} />)
    typeMnemonic(VALID_MNEMONIC)
    expect(screen.getByText('import_wallet.import_details.text_mnemonic_valid')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('warns and does not submit when the mnemonic is not recognized', async () => {
    const onSubmit = vi.fn()
    render(<ImportDetailsForm onSubmit={onSubmit} sessionInfo={mockedSessionInfo} />)
    typeMnemonic('not a real seed phrase at all')
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() =>
      expect(screen.getByText('import_wallet.import_details.alert_mnemonic_not_recognized_title')).toBeInTheDocument(),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('warns and does not submit when the blockheight is larger than current blockheight', async () => {
    await withRuntimeLocale('en-US', async () => {
      const onSubmit = vi.fn()
      const currentBlockHeight = pseudoRandomInteger(1, Number.MAX_SAFE_INTEGER - 1)
      render(
        <ImportDetailsForm
          onSubmit={onSubmit}
          sessionInfo={{ ...mockedSessionInfo, block_height: currentBlockHeight }}
        />,
      )
      typeBlockheight(currentBlockHeight + 1)
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() =>
        expect(
          screen.getByText(
            `import_wallet.import_details.feedback_invalid_blockheight {"min":"0","max":"${currentBlockHeight.toLocaleString()}"}`,
          ),
        ).toBeInTheDocument(),
      )
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('submits when all values are valid', async () => {
    const onSubmit = vi.fn()
    render(
      <ImportDetailsForm
        onSubmit={onSubmit}
        sessionInfo={mockedSessionInfo}
        initialValues={{ mnemonicPhrase: VALID_MNEMONIC, blockheight: 700_000, gaplimit: 50 }}
      />,
    )
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('shows a high-gaplimit warning above the threshold', async () => {
    render(
      <ImportDetailsForm
        onSubmit={vi.fn()}
        sessionInfo={mockedSessionInfo}
        initialValues={{ mnemonicPhrase: VALID_MNEMONIC, blockheight: 700_000, gaplimit: 9_999 }}
      />,
    )
    expect(screen.getByText('import_wallet.import_details.alert_high_gaplimit_value')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('renders a disabled submit button when disabled', async () => {
    render(<ImportDetailsForm onSubmit={vi.fn()} sessionInfo={mockedSessionInfo} disabled />)
    const submit = document.querySelector('button[type="submit"]')
    expect(submit).toBeDisabled()
    await flushActUpdates()
  })
})
