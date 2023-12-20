import { PropsWithChildren, forwardRef, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType, useField, useFormikContext } from 'formik'
import * as Api from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { formatBtc, isValidNumber, satsToBtc } from '../../utils'
import styles from './AmountInputField.module.css'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
  userRawInputValue?: string
  userSelectedInputUnit?: Unit
  displayValue?: string
}

const unitFromValue = (value: string | undefined) => {
  return value?.includes('.') ? 'BTC' : 'sats'
}

const formatBtcDisplayValue = (sats: Api.AmountSats) => {
  const formattedBtc = formatBtc(satsToBtc(String(sats)))
  const pointIndex = formattedBtc.indexOf('.')
  return (
    formattedBtc.substring(0, pointIndex + 3) +
    ' ' +
    formattedBtc.substring(pointIndex + 3, pointIndex + 6) +
    ' ' +
    formattedBtc.substring(pointIndex + 6)
  )
}

type UniversalBitcoinInputProps = {
  label: string
  className?: string
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
            <rb.InputGroup.Text className={styles.inputGroupText}>
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
                    className={classNames(styles.button, {
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
            className={classNames('slashed-zeroes', styles.input, className)}
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

export type AmountInputFieldProps = {
  name: string
  label: string
  className?: string
  isLoading: boolean
  disabled?: boolean
  enableSweep?: boolean
  sourceJarBalance?: AccountBalanceSummary
}

export const AmountInputField = ({
  name,
  label,
  className,
  isLoading,
  disabled = false,
  enableSweep = false,
  sourceJarBalance,
}: AmountInputFieldProps) => {
  const { t } = useTranslation()
  const [field] = useField<AmountValue>(name)
  const form = useFormikContext<any>()
  const ref = useRef<HTMLInputElement>(null)

  return (
    <>
      <rb.Form.Group className="mb-4" controlId={name}>
        <rb.Form.Label>{label}</rb.Form.Label>

        {isLoading ? (
          <rb.Placeholder as="div" animation="wave">
            <rb.Placeholder xs={12} className={styles.inputLoader} />
          </rb.Placeholder>
        ) : (
          <div className={form.touched[field.name] && !!form.errors[field.name] ? 'is-invalid' : ''}>
            <UniversalBitcoinInput
              ref={ref}
              className={className}
              label={label}
              placeholder={t('send.placeholder_amount')}
              field={field}
              form={form}
              disabled={disabled || field.value?.isSweep}
            >
              {field.value?.isSweep === true && (
                <rb.Button
                  variant="dark"
                  className={styles.button}
                  onClick={() => {
                    form.setFieldValue(field.name, form.initialValues[field.name], true)
                    setTimeout(() => ref.current?.focus(), 4)
                  }}
                  disabled={disabled}
                >
                  <div className="d-flex justify-content-center align-items-center ps-2 pe-1">
                    <Sprite symbol="cancel" width="26" height="26" />
                    <>{t('send.button_clear_sweep')}</>
                  </div>
                </rb.Button>
              )}
              {enableSweep && field.value?.isSweep !== true && (
                <rb.Button
                  variant="outline-dark"
                  className={classNames(styles.button, {
                    'cursor-not-allowed': !sourceJarBalance,
                  })}
                  onClick={() => {
                    if (!sourceJarBalance) return
                    form.setFieldValue(
                      field.name,
                      {
                        value: 0,
                        isSweep: true,
                        displayValue: formatBtcDisplayValue(sourceJarBalance.calculatedAvailableBalanceInSats),
                      },
                      true,
                    )
                  }}
                  disabled={disabled || !sourceJarBalance}
                >
                  <div className="d-flex justify-content-center align-items-center">
                    <Sprite symbol="sweep" width="24px" height="24px" className="me-1" />
                    {t('send.button_sweep')}
                  </div>
                </rb.Button>
              )}
            </UniversalBitcoinInput>
          </div>
        )}
      </rb.Form.Group>
    </>
  )
}
