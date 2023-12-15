import { PropsWithChildren, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType, useField, useFormikContext } from 'formik'
import * as Api from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { formatBtc, noop, satsToBtc } from '../../utils'
import styles from './AmountInputField.module.css'

export type AmountValue = {
  value: Api.AmountSats | null
  userRawInputValue?: string
  displayValue?: string
  isSweep: boolean
}

type UniversalBitcoinInputProps = {
  label: string
  className?: string
  disabled?: boolean
  placeholder?: string
  field: FieldInputProps<AmountValue>
  form: FormikContextType<any>
}

const unitFromValue = (value: string | undefined) => {
  return value?.includes('.') ? 'BTC' : 'sats'
}

function UniversalBitcoinInput({
  label,
  className,
  disabled,
  placeholder,
  field,
  form,
  children,
}: PropsWithChildren<UniversalBitcoinInputProps>) {
  const [inputType, setInputType] = useState<{ type: 'text' | 'number'; inputMode?: 'decimal' }>({
    type: 'text',
    inputMode: 'decimal',
  })
  const [inputUnit, setInputUnit] = useState<Unit>(unitFromValue(field.value?.userRawInputValue))

  return (
    <>
      <rb.InputGroup hasValidation={true}>
        {inputUnit === 'sats' && (
          <rb.InputGroup.Text id="amountSats-addon1" className={styles.inputGroupText}>
            <Sprite symbol="sats" width="24" height="24" />
          </rb.InputGroup.Text>
        )}
        {inputUnit === 'BTC' && (
          <rb.InputGroup.Text id="amountSats-addon1" className={styles.inputGroupText}>
            <Sprite symbol="BTC" width="24" height="24" />
          </rb.InputGroup.Text>
        )}

        <rb.Form.Control
          aria-label={label}
          name={field.name}
          autoComplete="off"
          type={inputType.type}
          inputMode={inputType.inputMode}
          className={classNames('slashed-zeroes', styles.input, className)}
          value={
            inputType.type === 'text' ? field.value?.displayValue ?? '' : String(field.value?.userRawInputValue ?? '')
          }
          onFocus={(e) => {
            setInputUnit(unitFromValue(field.value?.userRawInputValue))
            setInputType({
              type: 'number',
            })
          }}
          step={inputUnit === 'sats' ? '1' : '0.00000001'}
          onBlur={(e) => {
            const displayValueInBtc =
              field.value.value === null
                ? field.value.displayValue
                : (() => {
                    const formattedBtc = formatBtc(satsToBtc(String(field.value.value)))
                    const pointIndex = formattedBtc.indexOf('.')
                    const formatted =
                      formattedBtc.substring(0, pointIndex + 3) +
                      ' ' +
                      formattedBtc.substring(pointIndex + 3, pointIndex + 5) +
                      ' ' +
                      formattedBtc.substring(pointIndex + 5)
                    return formatted
                  })()

            setInputUnit('BTC')

            form.setFieldValue(
              field.name,
              {
                ...field.value,
                displayValue: displayValueInBtc,
              },
              false,
            )
            setInputType({
              type: 'text',
              inputMode: 'decimal',
            })
            field.onBlur(e)
          }}
          min={1}
          placeholder={placeholder}
          required
          onChange={(e) => {
            const valWithoutSpace = (e.target.value ?? '').replace(/,/g, '').replace(/\s/g, '')
            const unit = unitFromValue(valWithoutSpace)
            setInputUnit(unit)

            let numberValues
            if (unit === 'BTC') {
              const splitted = valWithoutSpace.split('.')
              const [integerPart, fractionalPart] = splitted
              if (splitted.length !== 2) {
                numberValues = undefined
              } else {
                const paddedFractionalPart = fractionalPart.padEnd(8, '0')
                numberValues = `${integerPart}${paddedFractionalPart}`?.match(/\d+/g)?.join('')
              }
            } else {
              numberValues = valWithoutSpace?.match(/\d+/g)?.join('')
            }
            const satValue = numberValues ? parseInt(numberValues, 10) : null

            form.setFieldValue(
              field.name,
              {
                value: satValue,
                userRawInputValue: e.target.value,
                displayValue: e.target.value, //displayValue,
                fromJar: null,
              },
              true,
            )
          }}
          isInvalid={form.touched[field.name] && !!form.errors[field.name]}
          disabled={disabled}
        />
        {children}
        <rb.Form.Control.Feedback type="invalid">
          <>{form.errors[field.name]}</>
        </rb.Form.Control.Feedback>
      </rb.InputGroup>
    </>
  )
}

/*function UniversalBitcoinInputOLD({label, className, disabled, placeholder, field, form}: UniversalBitcoinInputProps) {

  const [inputType, setInputType] = useState<{ type: 'text' | 'number', inputMode?: 'decimal' }>({
    type: 'text',
    inputMode: 'decimal'
  })

  return (<>
                  <rb.Form.Control
                    aria-label={label}
                    name={field.name}
                    autoComplete="off"
                    type={inputType.type}
                    inputMode={inputType.inputMode}
                    className={classNames('slashed-zeroes', styles.input, className)}
                    value={inputType.type === 'text' ? field.value?.displayValue ?? '' : String(field.value?.value ?? '') }
                    onFocus={(e) => {
                      setInputType({
                        type: 'number'
                      })
                    }}
                    onBlur={(e) => {
                      const displayValue = field.value.value === null ? field.value.displayValue : (() => {
                        const formattedBtc = formatBtc(satsToBtc(String(field.value.value)))
                        const pointIndex = formattedBtc.indexOf('.')
                        const formatted = formattedBtc.substring(0, pointIndex + 3) 
                        + ' ' + formattedBtc.substring(pointIndex + 3, pointIndex + 5)
                        + ' ' + formattedBtc.substring(pointIndex + 5)
                        return formatted
                      })()
                      form.setFieldValue(
                        field.name,
                        {
                          ...field.value,
                          displayValue: displayValue
                        },
                        false,
                      )
                      setInputType({
                        type: 'text',
                        inputMode: 'decimal'
                      })
                      field.onBlur(e)
                    }}
                    min={1}
                    placeholder={placeholder}
                    required
                    onChange={(e) => {
                      const valWithoutSpace = (e.target.value ?? '').replace(/,/g, '').replace(/\s/g, '')
                      
                      const isValidInput = /[\d\.]+/g.test(valWithoutSpace)
                          
                        && isValidNumber(parseFloat(valWithoutSpace))
                      if (!isValidInput && valWithoutSpace !== '') {
                        form.setFieldValue(
                          field.name,
                          {
                            value: null,
                            displayValue: e.target.value,
                            fromJar: null,
                          },
                          true,
                        )
                      } else {

                      let numberValues: string | undefined
                      if (valWithoutSpace.includes('.')) {
                        const splitted = valWithoutSpace.split('.')
                        const [integerPart, fractionalPart] = splitted
                        if (splitted.length !== 2) {
                          numberValues = undefined
                        } else {
                          const paddedFractionalPart = fractionalPart.padEnd(8, '0')
                          numberValues = `${integerPart}${paddedFractionalPart}`?.match(/\d+/g)?.join('')
                        }
                      } else {
                        numberValues = valWithoutSpace?.match(/\d+/g)?.join('')
                      }
                      const satValue = numberValues ? parseInt(numberValues, 10) : null

                      form.setFieldValue(
                        field.name,
                        {
                          value: satValue,
                          displayValue: e.target.value, //displayValue,
                          fromJar: null,
                        },
                        true,
                      )
                    }
                    }}
                    isInvalid={form.touched[field.name] && !!form.errors[field.name]}
                    disabled={disabled}
                  />
  </>)
}*/

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

  const amountFieldValue = useMemo(() => {
    if (field.value?.isSweep) {
      if (!sourceJarBalance) return ''
      return `${sourceJarBalance.calculatedAvailableBalanceInSats}`
    }

    return field.value?.value ?? ''
  }, [sourceJarBalance, field])

  return (
    <>
      <rb.Form.Group className="mb-4" controlId="amount">
        <rb.Form.Label>{label}</rb.Form.Label>

        {isLoading ? (
          <rb.Placeholder as="div" animation="wave">
            <rb.Placeholder xs={12} className={styles.inputLoader} />
          </rb.Placeholder>
        ) : (
          <>
            {field.value?.isSweep === true ? (
              <rb.InputGroup hasValidation={false}>
                <rb.Form.Control
                  aria-label={label}
                  name={field.name}
                  className={classNames('slashed-zeroes', styles.input, className)}
                  value={amountFieldValue}
                  required
                  onChange={noop}
                  disabled={true}
                  readOnly={true}
                />
                <rb.Button
                  variant="dark"
                  className={styles.button}
                  onClick={() => {
                    form.setFieldValue(field.name, form.initialValues[field.name], true)
                  }}
                  disabled={disabled}
                >
                  <div className="d-flex justify-content-center align-items-center ps-2 pe-1">
                    <Sprite symbol="cancel" width="26" height="26" />
                    <>{t('send.button_clear_sweep')}</>
                  </div>
                </rb.Button>
              </rb.InputGroup>
            ) : (
              <div className={form.touched[field.name] && !!form.errors[field.name] ? 'is-invalid' : ''}>
                <UniversalBitcoinInput
                  className={className}
                  label={label}
                  placeholder={t('send.placeholder_amount')}
                  field={field}
                  form={form}
                  disabled={disabled}
                >
                  {enableSweep && (
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

                <rb.InputGroup hasValidation={true}>
                  <rb.Form.Control
                    aria-label={label}
                    name={field.name}
                    type="number"
                    className={classNames('slashed-zeroes', styles.input, className)}
                    value={amountFieldValue}
                    onBlur={field.onBlur}
                    min={1}
                    placeholder={t('send.placeholder_amount')}
                    required
                    onChange={(e) => {
                      const value = e.target.value
                      form.setFieldValue(
                        field.name,
                        {
                          value: value === '' ? null : parseInt(value, 10),
                          fromJar: null,
                        },
                        true,
                      )
                    }}
                    isInvalid={form.touched[field.name] && !!form.errors[field.name]}
                    disabled={disabled}
                  />
                  {enableSweep && (
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
                  <rb.Form.Control.Feedback type="invalid">
                    <>{form.errors[field.name]}</>
                  </rb.Form.Control.Feedback>
                </rb.InputGroup>
              </div>
            )}
          </>
        )}
      </rb.Form.Group>
    </>
  )
}
