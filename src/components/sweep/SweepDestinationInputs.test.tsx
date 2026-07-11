import { render, screen } from '@testing-library/react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { SweepDestinationInputs } from './SweepDestinationInputs'
import type { SweepFormValues } from './SweepFormSchema'

type SweepForm = UseFormReturn<SweepFormValues, unknown, SweepFormValues>
type SweepFields = Array<FieldArrayWithId<SweepFormValues, 'destinations', 'id'>>

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  }),
}))

describe('SweepDestinationInputs', () => {
  const defaultFormMock = {
    formState: {
      errors: {},
      isSubmitted: false,
      touchedFields: {},
    },
    register: vi.fn((name: string) => ({ name, onBlur: vi.fn(), onChange: vi.fn(), ref: vi.fn() })),
  } as unknown as SweepForm

  const fields = [
    { id: '1', address: '' },
    { id: '2', address: '' },
  ] as unknown as SweepFields

  it('renders input fields correctly', () => {
    render(
      <SweepDestinationInputs
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
      />,
    )

    // Should render 2 inputs
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(2)

    // Labels should have the index
    expect(screen.getByText('scheduler.label_destination_input {"destination":1}')).toBeInTheDocument()
    expect(screen.getByText('scheduler.label_destination_input {"destination":2}')).toBeInTheDocument()

    // Inputs should not be disabled
    expect(inputs[0]).not.toBeDisabled()
    expect(inputs[1]).not.toBeDisabled()
  })

  it('renders disabled input fields', () => {
    render(
      <SweepDestinationInputs
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
        disabled={true}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toBeDisabled()
    expect(inputs[1]).toBeDisabled()
  })

  it('shows error messages when submitted and there is an error', () => {
    const errorFormMock = {
      ...defaultFormMock,
      formState: {
        errors: {
          destinations: [
            { address: { message: 'Invalid address 1' } },
            undefined, // No error for second field
          ],
        },
        isSubmitted: true,
        touchedFields: {},
      },
    } as unknown as SweepForm

    render(
      <SweepDestinationInputs
        formState={errorFormMock.formState}
        setValue={errorFormMock.setValue}
        register={errorFormMock.register}
        fields={fields}
      />,
    )

    expect(screen.getByText('Invalid address 1')).toBeInTheDocument()

    // Check data-invalid attribute on Field (which is just a div in the real implementation but we can check the DOM)
    // The closest div to the label with data-invalid
    const label = screen.getByText('scheduler.label_destination_input {"destination":1}')
    const fieldDiv = label.closest('div[data-invalid="true"]')
    expect(fieldDiv).toBeInTheDocument()
  })
})
