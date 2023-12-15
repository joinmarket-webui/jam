import { PropsWithChildren, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { FieldInputProps, FormikContextType, useField, useFormikContext } from 'formik'
import * as Api from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { btcToSats, formatBtc, isValidNumber, noop, satsToBtc } from '../../utils'
import styles from './AmountInputField.module.css'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
  userRawInputValue?: string
  userSelectedInputUnit?: Unit
  displayValue?: string
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

const formatBtcValue = (sats: Api.AmountSats) => {
  const formattedBtc = formatBtc(satsToBtc(String(sats)))
  const pointIndex = formattedBtc.indexOf('.')
  return (
    formattedBtc.substring(0, pointIndex + 3) +
    ' ' +
    formattedBtc.substring(pointIndex + 3, pointIndex + 5) +
    ' ' +
    formattedBtc.substring(pointIndex + 5)
  )
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

  const displayInputUnit = useMemo(
    () => field.value?.userSelectedInputUnit ?? unitFromValue(field.value?.userRawInputValue),
    [field],
  )

  return (
    <>
      <pre>{JSON.stringify(field.value, null, 2)}</pre>
      <rb.InputGroup hasValidation={true}>
        {inputType.type === 'number' && (
          <>
            <rb.Button
              variant="outline-dark"
              className={classNames(styles.button, {
                'cursor-not-allowed': disabled,
              })}
              onMouseDown={(e) => {
                e.preventDefault() // prevent losing focus of the current element

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
          placeholder={placeholder}
          required
          min={displayInputUnit === 'sats' ? '1' : '0.00000001'}
          step={displayInputUnit === 'sats' ? '1' : '0.00000001'}
          onFocus={() => {
            setInputType({ type: 'number' })
          }}
          onBlur={(e) => {
            setInputType({
              type: 'text',
              inputMode: 'decimal',
            })

            const displayValueInBtc =
              field.value.value === null ? field.value.displayValue : `${'\u20BF'} ${formatBtcValue(field.value.value)}`

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
            const valWithoutSpace = (e.target.value ?? '').replace(/,/g, '').replace(/\s/g, '')

            let numberValues: string | undefined
            if (field.value.userSelectedInputUnit) {
              if (field.value.userSelectedInputUnit === 'BTC') {
                const satsOrNan = btcToSats(valWithoutSpace)
                numberValues = isValidNumber(satsOrNan) ? String(satsOrNan) : undefined
              } else {
                numberValues = valWithoutSpace?.match(/\d+/g)?.join('')
              }
            } else {
              const unit = unitFromValue(valWithoutSpace)
              if (unit === 'BTC') {
                const splitted = valWithoutSpace.split('.')
                const [integerPart, fractionalPart = ''] = splitted
                if (splitted.length > 0) {
                  numberValues = undefined
                } else {
                  const paddedFractionalPart = fractionalPart.padEnd(8, '0')
                  numberValues = `${integerPart}${paddedFractionalPart}`?.match(/\d+/g)?.join('')
                }
              } else {
                numberValues = valWithoutSpace?.match(/\d+/g)?.join('')
              }
            }
            const satValue = numberValues ? parseInt(numberValues, 10) : null

            form.setFieldValue(
              field.name,
              {
                value: satValue,
                userRawInputValue: e.target.value,
                userSelectedInputUnit: field.value?.userSelectedInputUnit,
                displayValue: e.target.value,
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
              </div>
            )}
          </>
        )}
      </rb.Form.Group>
    </>
  )
}
