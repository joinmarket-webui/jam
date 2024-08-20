import { PropsWithChildren, forwardRef, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType } from 'formik'
import Sprite from './Sprite'
import * as Api from '../libs/JmWalletApi'
import { BITCOIN_SYMBOL, formatBtcDisplayValue, isValidNumber } from '../utils'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
  userRawInputValue?: string
  displayValue?: string
}

export const toAmountValue = (value: Api.AmountSats): AmountValue => ({
  value,
  isSweep: false,
  userRawInputValue: String(value),
  displayValue: formatBtcDisplayValue(value),
})

const unitFromValue = (value: string | undefined): Unit | undefined => {
  return value !== undefined && value !== '' ? (value?.includes('.') ? 'BTC' : 'sats') : undefined
}

export type BitcoinAmountInputProps = {
  label: string
  className?: string
  inputGroupTextClassName?: string
  disabled?: boolean
  placeholder?: string
  field: FieldInputProps<AmountValue | undefined>
  form: FormikContextType<any>
}

const BitcoinAmountInput = forwardRef(
  (
    {
      label,
      className,
      inputGroupTextClassName,
      disabled,
      placeholder,
      field,
      form,
      children,
    }: PropsWithChildren<BitcoinAmountInputProps>,
    ref: React.Ref<HTMLInputElement>,
  ) => {
    const [inputType, setInputType] = useState<{ type: 'text' | 'number'; inputMode?: 'decimal' }>({
      type: 'text',
      inputMode: 'decimal',
    })

    const displayInputUnit = useMemo(() => {
      return inputType.type === 'number'
        ? unitFromValue(field.value?.userRawInputValue)
        : field.value?.displayValue
          ? 'BTC'
          : undefined
    }, [field, inputType])

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setInputType({
        type: 'text',
        inputMode: 'decimal',
      })

      let displayValue = String(field.value?.value || '')
      if (isValidNumber(field.value?.value)) {
        displayValue = formatBtcDisplayValue(field.value!.value!)
      }

      form.setFieldValue(
        field.name,
        {
          ...field.value,
          displayValue,
        },
        false,
      )
      field.onBlur(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawUserInputOrEmpty = e.target.value ?? ''
      const validNumberRegex = /^-?\d*\.?\d*$/
      if (!validNumberRegex.test(rawUserInputOrEmpty)) {
        return
      }
      const floatValueOrNan = parseFloat(rawUserInputOrEmpty)
      if (!isValidNumber(floatValueOrNan)) {
        form.setFieldValue(
          field.name,
          {
            ...field.value,
            value: null,
            userRawInputValue: e.target.value,
            displayValue: e.target.value,
          },
          true,
        )
        return
      } else {
        const value: number = floatValueOrNan
        let numberValues: string | undefined
        const unit =
          rawUserInputOrEmpty.includes('.') && parseFloat(rawUserInputOrEmpty)
            ? unitFromValue(String(rawUserInputOrEmpty))
            : unitFromValue(String(value))
        if (unit === 'BTC') {
          const splitted = String(value).split('.')
          const [integerPart, fractionalPart = ''] = splitted
          const paddedFractionalPart = fractionalPart.padEnd(8, '0').substring(0, 8)
          numberValues = `${integerPart}${paddedFractionalPart}`
        } else {
          numberValues = value.toLocaleString('en-US', {
            maximumFractionDigits: 0,
            useGrouping: false,
          })
        }

        form.setFieldValue(
          field.name,
          {
            value: parseInt(numberValues, 10),
            userRawInputValue: e.target.value,
            displayValue: e.target.value,
          },
          true,
        )
      }
    }

    return (
      <>
        <rb.InputGroup hasValidation={true}>
          <rb.InputGroup.Text className={inputGroupTextClassName}>
            {displayInputUnit === undefined && <>…</>}
            {displayInputUnit === 'sats' && <Sprite symbol="sats" width="24" height="24" />}
            {displayInputUnit === 'BTC' && <span style={{ fontSize: '1.175rem' }}>{BITCOIN_SYMBOL}</span>}
          </rb.InputGroup.Text>
          <rb.Form.Control
            ref={ref}
            aria-label={label}
            data-value={field.value?.value}
            data-display-unit={displayInputUnit}
            data-display-value={field.value?.displayValue}
            name={field.name}
            autoComplete="off"
            inputMode={inputType.inputMode}
            className={classNames('slashed-zeroes', className)}
            value={
              inputType.type === 'text'
                ? (field.value?.displayValue ?? '')
                : String(field.value?.userRawInputValue ?? '')
            }
            placeholder={placeholder}
            min={displayInputUnit === 'BTC' ? '0.00000001' : '1'}
            step={displayInputUnit === 'BTC' ? '0.00000001' : '1'}
            isInvalid={form.touched[field.name] && !!form.errors[field.name]}
            disabled={disabled}
            required
            onFocus={() => {
              setInputType({ type: 'number' })
            }}
            onBlur={handleBlur}
            onChange={handleChange}
          />
          {children}
          <rb.Form.Control.Feedback type="invalid">
            <>{form.errors[field.name]}</>
          </rb.Form.Control.Feedback>
        </rb.InputGroup>
      </>
    )
  },
)

export default BitcoinAmountInput
