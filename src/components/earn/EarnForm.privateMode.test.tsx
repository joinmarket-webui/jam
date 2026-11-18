import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { EarnForm } from './EarnForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { minAmountMin?: string; minAmountMax?: string }) =>
      options?.minAmountMax === undefined ? key : `${key} ${options.minAmountMin} ${options.minAmountMax}`,
  }),
}))

// the upper limit of the minimum amount is the largest confirmed jar balance
const LARGEST_JAR_BALANCE = 5_000_000_000

const renderForm = () =>
  render(
    <JamDisplayContextProvider>
      <EarnForm
        isWaitingMakerStart={false}
        offerMinsizeMax={LARGEST_JAR_BALANCE}
        onSubmit={vi.fn()}
        fidelityBonds={[]}
      />
    </JamDisplayContextProvider>,
  )

const submitTooLargeMinAmount = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'earn.earn_options' }))
  const input = screen.getByLabelText('earn.label_min_amount_input')
  await user.clear(input)
  await user.type(input, '999999999999')
  await user.click(screen.getByRole('button', { name: 'earn.button_start' }))
  return input
}

describe('EarnForm in private mode', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  afterEach(() => {
    jamSettingsStore.getState().clear()
  })

  it('hides the largest jar balance in the minimum amount feedback when private mode is enabled', async () => {
    jamSettingsStore.getState().update({ privateMode: true })

    renderForm()
    const input = await submitTooLargeMinAmount()

    const feedback = await screen.findByText(/^earn\.feedback_invalid_min_amount_range/)
    expect(feedback).toHaveTextContent('*****')
    expect(feedback).not.toHaveTextContent(LARGEST_JAR_BALANCE.toLocaleString())
    expect(input).not.toHaveAttribute('max')
  })

  it('shows the largest jar balance in the minimum amount feedback when private mode is disabled', async () => {
    jamSettingsStore.getState().update({ privateMode: false })

    renderForm()
    const input = await submitTooLargeMinAmount()

    const feedback = await screen.findByText(/^earn\.feedback_invalid_min_amount_range/)
    expect(feedback).toHaveTextContent(LARGEST_JAR_BALANCE.toLocaleString())
    expect(input).toHaveAttribute('max', String(LARGEST_JAR_BALANCE))
  })
})
