import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { useField, useFormikContext } from 'formik'
import * as Api from '../../libs/JmWalletApi'
import Sprite from '../Sprite'
import { jarName } from '../jars/Jar'
import JarSelectorModal from '../JarSelectorModal'
import { WalletInfo } from '../../context/WalletContext'
import { noop } from '../../utils'

export type DestinationValue = {
  value: Api.BitcoinAddress | null
  fromJar: JarIndex | null
}

export type DestinationInputFieldProps = {
  name: string
  label: string
  className?: string
  walletInfo?: WalletInfo
  sourceJarIndex?: JarIndex
  loadNewWalletAddress: (props: { signal: AbortSignal; jarIndex: JarIndex }) => Promise<Api.BitcoinAddress>
  isLoading: boolean
  disabled?: boolean
}

export const DestinationInputField = ({
  name,
  label,
  className,
  walletInfo,
  sourceJarIndex,
  loadNewWalletAddress,
  isLoading,
  disabled = false,
}: DestinationInputFieldProps) => {
  const { t } = useTranslation()
  const [field] = useField<DestinationValue>(name)
  const form = useFormikContext<any>()

  const ref = useRef<HTMLInputElement>(null)
  const [destinationJarPickerShown, setDestinationJarPickerShown] = useState(false)

  return (
    <>
      {!isLoading && walletInfo && (
        <>
          <JarSelectorModal
            isShown={destinationJarPickerShown}
            title={t('send.title_jar_selector')}
            accountBalances={walletInfo.balanceSummary.accountBalances}
            totalBalance={walletInfo.balanceSummary.calculatedTotalBalanceInSats}
            disabledJar={sourceJarIndex ?? undefined}
            onCancel={() => setDestinationJarPickerShown(false)}
            onConfirm={(selectedJar) => {
              const abortCtrl = new AbortController()

              return loadNewWalletAddress({
                signal: abortCtrl.signal,
                jarIndex: selectedJar,
              })
                .then((address) => {
                  if (abortCtrl.signal.aborted) return
                  form.setFieldValue(
                    field.name,
                    {
                      value: address,
                      fromJar: selectedJar,
                    },
                    true,
                  )

                  setDestinationJarPickerShown(false)
                })
                .catch((err) => {
                  if (abortCtrl.signal.aborted) return
                  setDestinationJarPickerShown(false)
                })
            }}
          />
        </>
      )}
      <rb.Form.Group className="mb-4" controlId="destination">
        <rb.Form.Label>{label}</rb.Form.Label>
        {isLoading ? (
          <rb.Placeholder as="div" animation="wave">
            <rb.Placeholder xs={12} className={className} />
          </rb.Placeholder>
        ) : (
          <>
            {field.value.fromJar !== null ? (
              <rb.InputGroup hasValidation={false}>
                <rb.Form.Control
                  className={classNames('slashed-zeroes', className)}
                  value={`${jarName(field.value.fromJar)} (${field.value.value})`}
                  required
                  onChange={noop}
                  disabled={true}
                  readOnly={true}
                />
                <rb.Button
                  variant="dark"
                  onClick={() => {
                    form.setFieldValue(field.name, form.initialValues[field.name], true)
                    setTimeout(() => ref.current?.focus(), 4)
                  }}
                  disabled={disabled}
                >
                  <div className="d-flex justify-content-center align-items-center">
                    <Sprite symbol="cancel" width="26" height="26" />
                  </div>
                </rb.Button>
              </rb.InputGroup>
            ) : (
              <div className={form.touched[field.name] && !!form.errors[field.name] ? 'is-invalid' : ''}>
                <rb.InputGroup hasValidation={true}>
                  <rb.Form.Control
                    ref={ref}
                    aria-label={label}
                    name={field.name}
                    placeholder={t('send.placeholder_recipient')}
                    className={classNames('slashed-zeroes', className)}
                    value={field.value.value || ''}
                    onBlur={field.onBlur}
                    required
                    onChange={(e) => {
                      const value = e.target.value
                      form.setFieldValue(
                        field.name,
                        {
                          value: value === '' ? null : value,
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
                    onClick={() => setDestinationJarPickerShown(true)}
                    disabled={disabled || !walletInfo}
                  >
                    <div className="d-flex justify-content-center align-items-center">
                      <Sprite symbol="jar-closed-empty" width="28px" height="28px" style={{ marginTop: '-3px' }} />
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
