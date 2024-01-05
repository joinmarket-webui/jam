import { PropsWithChildren, forwardRef, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType } from 'formik'
import Sprite from './Sprite'
import * as Api from '../libs/JmWalletApi'
import { formatBtcDisplayValue, isValidNumber, satsToBtc } from '../utils'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
  userRawInputValue?: string
  userSelectedInputUnit?: Unit
  displayValue?: string
}

const unitFromValue = (value: string | undefined): Unit => {
  return value?.includes('.') ? 'BTC' : 'sats'
}

type UniversalBitcoinInputProps = {
  label: string
  className?: string
  inputGroupTextClassName?: string
  disabled?: boolean
  placeholder?: string
  field: FieldInputProps<AmountValue>
  form: FormikContextType<any>
  enableInputUnitToggle?: boolean
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
      enableInputUnitToggle,
    }: PropsWithChildren<UniversalBitcoinInputProps>,
    ref: React.Ref<HTMLInputElement>,
  ) => {
    const [inputType, setInputType] = useState<{ type: 'text' | 'number'; inputMode?: 'decimal' }>({
      type: 'text',
      inputMode: 'decimal',
    })

    const displayInputUnit = useMemo(
      () => field.value?.userSelectedInputUnit ?? unitFromValue(field.value?.userRawInputValue),
      [field],
    )

    return (
      <>
        <rb.InputGroup hasValidation={true}>
          {!enableInputUnitToggle ? (
            <rb.InputGroup.Text className={inputGroupTextClassName}>
              {inputType.type === 'number' ? (
                <>
                  {displayInputUnit === 'sats' && <Sprite symbol="sats" width="24" height="24" />}
                  {displayInputUnit === 'BTC' && <span className="fw-bold">{'\u20BF'}</span>}
                </>
              ) : (
                <>{field.value?.displayValue ? <span className="fw-bold">{'\u20BF'}</span> : '…'}</>
              )}
            </rb.InputGroup.Text>
          ) : (
            <>
              {inputType.type === 'number' && (
                <>
                  <rb.Button
                    variant="outline-dark"
                    className={classNames({
                      'cursor-not-allowed': disabled,
                    })}
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    onClick={(e) => {
                      e.preventDefault() // prevent losing focus of the current element
                      if (!enableInputUnitToggle) return

                      const newUnit = displayInputUnit === 'sats' ? 'BTC' : 'sats'

                      const userRawInputValue =
                        field.value?.value !== null
                          ? (newUnit === 'sats'
                              ? String(field.value.value)
                              : satsToBtc(String(field.value.value))
                            ).toLocaleString('en-US', {
                              maximumFractionDigits: Math.log10(100_000_000),
                              useGrouping: false,
                            })
                          : field.value?.userRawInputValue

                      form.setFieldValue(
                        field.name,
                        {
                          ...field.value,
                          userRawInputValue: userRawInputValue,
                          userSelectedInputUnit: newUnit,
                        },
                        true,
                      )
                    }}
                    disabled={disabled}
                  >
                    {displayInputUnit === 'sats' && <Sprite symbol="sats" width="24" height="24" />}
                    {displayInputUnit === 'BTC' && <Sprite symbol="BTC" width="24" height="24" />}
                  </rb.Button>
                </>
              )}
            </>
          )}
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

              const displayValueInBtc =
                field.value.value === null ? field.value.displayValue : formatBtcDisplayValue(field.value.value)

              form.setFieldValue(
                field.name,
                {
                  ...field.value,
                  displayValue: displayValueInBtc,
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
                const unit = field.value.userSelectedInputUnit ?? unitFromValue(String(value))
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
                    userSelectedInputUnit: field.value?.userSelectedInputUnit,
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
