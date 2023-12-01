import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { useField, useFormikContext } from 'formik'
import * as Api from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { noop } from '../../utils'
import styles from './AmountInputField.module.css'

export type AmountValue = {
  value: Api.AmountSats | null
  isSweep: boolean
}

export type AmountInputFieldProps = {
  name: string
  label: string
  className?: string
  sourceJarBalance?: AccountBalanceSummary
  isLoading: boolean
  disabled?: boolean
}

export const AmountInputField = ({
  name,
  label,
  className,
  sourceJarBalance,
  isLoading,
  disabled = false,
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
