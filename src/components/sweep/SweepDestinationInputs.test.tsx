import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    setValue: vi.fn(),
    register: vi.fn((name: string) => ({ name, onBlur: vi.fn(), onChange: vi.fn(), ref: vi.fn() })),
  } as unknown as SweepForm

  const fields = [
    { id: '1', address: '' },
    { id: '2', address: '' },
  ] as unknown as SweepFields

  it('renders input fields correctly', async () => {
    render(
      <SweepDestinationInputs
        minNumberOfFields={fields.length}
        maxNumberOfFields={fields.length}
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

    // QR-Code scan button is present
    const qrCodeButtons = await screen.findAllByRole('button', { name: 'send.qr_scan_title' })
    expect(qrCodeButtons.length).toBe(fields.length)
  })

  it('qr-code scanner opens', () => {
    render(
      <SweepDestinationInputs
        minNumberOfFields={fields.length}
        maxNumberOfFields={fields.length}
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
      />,
    )

    // QR-Code scan button is present
    const qrCodeButtons = screen.queryAllByRole('button', { name: 'send.qr_scan_title' })
    expect(qrCodeButtons.length).toBe(fields.length)

    // CR-Code scanner not active yet
    expect(screen.queryByText('send.qr_paste_button')).not.toBeInTheDocument()
    expect(screen.queryByText('send.qr_scan_file_button')).not.toBeInTheDocument()
    expect(screen.queryByText('send.confirm_button_reject')).not.toBeInTheDocument()

    fireEvent.click(qrCodeButtons[0])

    expect(screen.queryByText('send.qr_paste_button')).toBeInTheDocument()
    expect(screen.queryByText('send.qr_scan_file_button')).toBeInTheDocument()
    expect(screen.queryByText('modal.confirm_button_reject')).toBeInTheDocument()
  })

  it('renders disabled input fields', () => {
    render(
      <SweepDestinationInputs
        minNumberOfFields={fields.length}
        maxNumberOfFields={fields.length}
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

  it('handles bip21 format from paste events', async () => {
    render(
      <SweepDestinationInputs
        minNumberOfFields={fields.length}
        maxNumberOfFields={fields.length}
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    await act(async () => {
      await userEvent.click(inputs[0])
      await userEvent.paste('anything')
    })
    expect(defaultFormMock.setValue).not.toHaveBeenCalled()

    await act(async () => {
      await userEvent.click(inputs[0])
      await userEvent.paste('bitcoin:')
    })
    expect(defaultFormMock.setValue).not.toHaveBeenCalled()

    await act(async () => {
      await userEvent.click(inputs[1])
      await userEvent.paste(
        'bitcoin:bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk?amount=0.0021&label=order%20123&message=regtest',
      )
    })
    expect(defaultFormMock.setValue).toHaveBeenCalledWith(
      `destinations.1.address`,
      'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk',
      { shouldValidate: true },
    )
  })

  it('adds additional destination inputs', () => {
    const maxNumberOfFields = 3
    const { rerender } = render(
      <SweepDestinationInputs
        minNumberOfFields={1}
        maxNumberOfFields={maxNumberOfFields}
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
        onClickAppend={() => {
          const id = fields.map((it) => it.id).reduce((acc, i) => acc + Number(i), 0) + 1
          fields.push({ id: String(id), address: '' })
        }}
      />,
    )

    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBe(2)

    expect(screen.getByRole('button', { name: 'Add additional destination' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Add additional destination' }))

    rerender(
      <SweepDestinationInputs
        minNumberOfFields={1}
        maxNumberOfFields={3}
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
        onClickRemove={() => fields.pop()}
        onClickAppend={() => {
          /* empty on purpose; wont be called*/
        }}
      />,
    )

    const inputsAfterAdd = screen.getAllByRole('textbox')
    expect(inputsAfterAdd.length).toBe(maxNumberOfFields)

    expect(screen.getByRole('button', { name: 'Add additional destination' })).toBeDisabled()

    const clearButtons = screen.queryAllByRole('button', { name: 'global.clear' })
    expect(clearButtons.length).toBe(fields.length - 1)

    fireEvent.click(clearButtons[0])

    rerender(
      <SweepDestinationInputs
        minNumberOfFields={1}
        maxNumberOfFields={3}
        formState={defaultFormMock.formState}
        setValue={defaultFormMock.setValue}
        register={defaultFormMock.register}
        fields={fields}
      />,
    )

    const inputsAfterClear = screen.getAllByRole('textbox')
    expect(inputsAfterClear.length).toBe(2)
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
        minNumberOfFields={fields.length}
        maxNumberOfFields={fields.length}
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
