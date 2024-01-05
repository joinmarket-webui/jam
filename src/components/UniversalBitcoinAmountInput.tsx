import { PropsWithChildren, forwardRef, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType } from 'formik'
import Sprite from './Sprite'
import * as Api from '../libs/JmWalletApi'
import { formatBtcDisplayValue, isValidNumber } from '../utils'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
  userRawInputValue?: string
  displayValue?: string
}

const unitFromValue = (value: string | undefined): Unit | undefined => {
  return value !== undefined ? (value?.includes('.') ? 'BTC' : 'sats') : undefined
}

type UniversalBitcoinInputProps = {
  label: string
  className?: string
  inputGroupTextClassName?: string
  disabled?: boolean
  placeholder?: string
  field: FieldInputProps<AmountValue | undefined>
  form: FormikContextType<any>
}

const UniversalBitcoinInput = forwardRef(
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
    }: PropsWithChildren<UniversalBitcoinInputProps>,
    ref: React.Ref<HTMLInputElement>,
  ) => {
    const [inputType, setInputType] = useState<{ type: 'text' | 'number'; inputMode?: 'decimal' }>({
      type: 'text',
      inputMode: 'decimal',
    })

    const displayInputUnit = useMemo(() => unitFromValue(field.value?.userRawInputValue), [field])

    return (
      <>
        <rb.InputGroup hasValidation={true}>
          <rb.InputGroup.Text className={inputGroupTextClassName}>
            {inputType.type === 'number' ? (
              <>
                {displayInputUnit === undefined && <>…</>}
                {displayInputUnit === 'sats' && <Sprite symbol="sats" width="24" height="24" />}
                {displayInputUnit === 'BTC' && <span className="fw-bold">{'\u20BF'}</span>}
              </>
            ) : (
              <>{field.value?.displayValue ? <span className="fw-bold">{'\u20BF'}</span> : '…'}</>
            )}
          </rb.InputGroup.Text>
          <rb.Form.Control
            ref={ref}
            aria-label={label}
            name={field.name}
            autoComplete="off"
            type={inputType.type}
            inputMode={inputType.inputMode}
            className={classNames('slashed-zeroes', className)}
            value={
              inputType.type === 'text' ? field.value?.displayValue ?? '' : String(field.value?.userRawInputValue ?? '')
            }
            placeholder={placeholder}
            min={displayInputUnit === 'sats' ? '1' : '0.00000001'}
            step={displayInputUnit === 'sats' ? '1' : '0.00000001'}
            isInvalid={form.touched[field.name] && !!form.errors[field.name]}
            disabled={disabled}
            required
            onFocus={() => {
              setInputType({ type: 'number' })
            }}
            onBlur={(e) => {
              setInputType({
                type: 'text',
                inputMode: 'decimal',
              })

              let displayValue = field.value?.value || ''
              if (field.value !== undefined && isValidNumber(field.value.value ?? undefined)) {
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
            }}
            onChange={(e) => {
              const valueOrNan = parseFloat(e.target.value ?? '')

              if (!isValidNumber(valueOrNan)) {
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
                const value: number = valueOrNan

                let numberValues: string | undefined
                const unit = unitFromValue(String(value))
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
            }}
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

export default UniversalBitcoinInput
