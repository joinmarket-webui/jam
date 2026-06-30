import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { MiningFeesForm } from './MiningFeesForm'
import type { MiningFeesFormValues } from './MiningFeesForm.schema'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../send/TxFeeForm', () => ({ TxFeeForm: () => <div data-testid="tx-fee-form" /> }))

vi.mock('../../ui/field', () => ({
  Field: ({ children, 'data-invalid': invalid }: { children?: ReactNode; 'data-invalid'?: boolean }) => (
    <div data-invalid={invalid}>{children}</div>
  ),
  FieldDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}))

vi.mock('../../ui/input-group', () => ({
  InputGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupAddon: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  InputGroupInput: (props: Record<string, unknown>) => <input {...props} />,
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
    expect(screen.getByTestId('tx-fee-form')).toBeInTheDocument()
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
