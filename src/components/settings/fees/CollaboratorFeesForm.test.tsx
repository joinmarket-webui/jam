import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { CollaboratorFeesForm } from './CollaboratorFeesForm'
import type { CollaboratorFeesFormValues } from './CollaboratorFeesForm.schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../ui/jam/CurrencySymbol', () => ({ SatSymbol: () => <span data-testid="sat" /> }))

const Host = ({ withErrors }: { withErrors?: boolean }) => {
  const form = useForm<CollaboratorFeesFormValues, unknown, CollaboratorFeesFormValues>({
    defaultValues: { maxCjFeeAbs: 1000, maxCjFeeRelInPercent: 0.5 },
  })
  const setErrors = () => {
    form.setError('maxCjFeeAbs', { message: 'abs too high' })
    form.setError('maxCjFeeRelInPercent', { message: 'rel too high' })
  }
  return (
    <>
      {withErrors && <button onClick={setErrors}>set-errors</button>}
      <CollaboratorFeesForm form={form} />
    </>
  )
}

describe('CollaboratorFeesForm', () => {
  it('renders both collaborator fee inputs', () => {
    render(<Host />)
    expect(document.querySelector('#collaborator-fees-max-cj-fee-abs')).toBeInTheDocument()
    expect(document.querySelector('#collaborator-fees-max-cj-fee-rel')).toBeInTheDocument()
  })

  it('shows validation error messages when the fields are invalid', () => {
    render(<Host withErrors />)
    fireEvent.click(screen.getByText('set-errors'))
    expect(screen.getByText('abs too high')).toBeInTheDocument()
    expect(screen.getByText('rel too high')).toBeInTheDocument()
  })
})
