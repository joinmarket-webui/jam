import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import { useField, useFormikContext } from 'formik'
import Sprite from '../Sprite'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { formatBtcDisplayValue } from '../../utils'
import BitcoinAmountInput, { AmountValue } from '../BitcoinAmountInput'
import styles from './AmountInputField.module.css'

export type AmountInputFieldProps = {
  name: string
  label: string
  placeholder?: string
  isLoading: boolean
  disabled?: boolean
  enableSweep?: boolean
  sourceJarBalance?: AccountBalanceSummary
}

export const AmountInputField = ({
  name,
  label,
  placeholder,
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
            <BitcoinAmountInput
              ref={ref}
              className={styles.input}
              inputGroupTextClassName={styles.inputGroupText}
              label={label}
              placeholder={placeholder}
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
                  className={styles.button}
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
            </BitcoinAmountInput>
          </div>
        )}
      </rb.Form.Group>
    </>
  )
}
