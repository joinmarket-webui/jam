import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { MiningFeesForm } from './MiningFeesForm'
import type { MiningFeesFormValues } from './MiningFeesForm.schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const Host = ({ withErrors }: { withErrors?: boolean }) => {
  const form = useForm<MiningFeesFormValues, unknown, MiningFeesFormValues>({
    defaultValues: { txFeesFactorInPercent: 20, maxSweepFeeChangeInPercent: 10 },
  })
  const setErrors = () => {
    form.setError('txFeesFactorInPercent', { message: 'factor too high' })
    form.setError('maxSweepFeeChangeInPercent', { message: 'sweep too high' })
  }
  return (
    <>
      {withErrors && <button onClick={setErrors}>set-errors</button>}
      <MiningFeesForm form={form} />
    </>
  )
}

describe('MiningFeesForm', () => {
  it('renders both fee inputs and the tx fee form', () => {
    render(<Host />)
    expect(document.querySelector('#txFeeInBlocks')).toBeInTheDocument()
    expect(document.querySelector('#txFeeInSatsPerVbyte')).not.toBeInTheDocument()

    expect(document.querySelector('#mining-fees-tx-fees-factor')).toBeInTheDocument()
    expect(document.querySelector('#mining-fees-sweep-fee-change')).toBeInTheDocument()
  })

  it('shows validation error messages when the fields are invalid', () => {
    render(<Host withErrors />)
    fireEvent.click(screen.getByText('set-errors'))
    expect(screen.getByText('factor too high')).toBeInTheDocument()
    expect(screen.getByText('sweep too high')).toBeInTheDocument()
  })
})
