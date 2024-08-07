import user from '@testing-library/user-event'
import { render, screen } from '../testUtils'

import { noop } from '../utils'

import BitcoinAmountInput, { AmountValue, BitcoinAmountInputProps } from './BitcoinAmountInput'
import { Formik } from 'formik'

describe('<BitcoinAmountInput />', () => {
  const setup = (props: Omit<BitcoinAmountInputProps, 'field' | 'form'>) => {
    render(
      <Formik initialValues={{ value: undefined }} onSubmit={noop}>
        {(form) => {
          const valueField = form.getFieldProps<AmountValue>('value')
          return <BitcoinAmountInput form={form} field={valueField} {...props} />
        }}
      </Formik>,
    )
  }

  it('should render without errors', () => {
    setup({
      label: 'test-label',
    })
    const inputElement = screen.getByLabelText('test-label')

    expect(inputElement).toBeVisible()
    expect(inputElement.dataset.value).toBe(undefined)
    expect(inputElement.dataset.displayUnit).toBe(undefined)
    expect(inputElement.dataset.displayValue).toBe(undefined)
  })

  it('amount can be entered in sats', async () => {
    setup({
      label: 'test-label',
    })

    const inputElement = screen.getByLabelText('test-label')

    await user.type(inputElement, '123456')

    expect(inputElement).toHaveFocus()
    expect(inputElement.dataset.value).toBe(`123456`)
    expect(inputElement.dataset.displayUnit).toBe(`sats`)
    expect(inputElement.dataset.displayValue).toBe(`123456`)

    // changes to display unit to BTC after element loses focus
    await user.tab()

    expect(inputElement).not.toHaveFocus()
    expect(inputElement.dataset.value).toBe(`123456`)
    expect(inputElement.dataset.displayUnit).toBe(`BTC`)
    expect(inputElement.dataset.displayValue).toBe(`0.00 123 456`)
  })

  it('amount can be entered in BTC', async () => {
    setup({
      label: 'test-label',
    })
    const inputElement = screen.getByLabelText('test-label')

    await user.type(inputElement, '1.234')

    expect(inputElement).toHaveFocus()
    expect(inputElement.dataset.value).toBe(`123400000`)
    expect(inputElement.dataset.displayUnit).toBe(`BTC`)
    expect(inputElement.dataset.displayValue).toBe(`1.234`)

    // keeps display unit in BTC after element loses focus
    await user.tab()

    expect(inputElement).not.toHaveFocus()
    expect(inputElement.dataset.value).toBe(`123400000`)
    expect(inputElement.dataset.displayUnit).toBe(`BTC`)
    expect(inputElement.dataset.displayValue).toBe(`1.23 400 000`)
  })

  it('given input must be a number', async () => {
    setup({
      label: 'test-label',
    })
    const inputElement = screen.getByLabelText('test-label')

    await user.type(inputElement, 'test')

    expect(inputElement).toHaveFocus()
    expect(inputElement.dataset.value).toBe(undefined)
    expect(inputElement.dataset.displayUnit).toBe(undefined)
    expect(inputElement.dataset.displayValue).toBe(undefined)

    await user.tab()

    expect(inputElement).not.toHaveFocus()
    expect(inputElement.dataset.value).toBe(undefined)
    expect(inputElement.dataset.displayUnit).toBe(undefined)
    expect(inputElement.dataset.displayValue).toBe('')
  })

  it('amount 1.0 should be interpreted as 1 BTC', async () => {
    setup({
      label: 'test-label',
    })
    const inputElement = screen.getByLabelText('test-label')

    await user.type(inputElement, '1.0')

    expect(inputElement).toHaveFocus()
    expect(inputElement.dataset.value).toBe('100000000')
    expect(inputElement.dataset.displayUnit).toBe('BTC')
    expect(inputElement.dataset.displayValue).toBe(`1.0`)

    await user.tab()

    expect(inputElement).not.toHaveFocus()
    expect(inputElement.dataset.value).toBe('100000000')
    expect(inputElement.dataset.displayUnit).toBe('BTC')
    expect(inputElement.dataset.displayValue).toBe(`1.00 000 000`)
  })
})
