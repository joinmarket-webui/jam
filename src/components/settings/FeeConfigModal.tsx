import { forwardRef, useRef, useCallback, useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import { useRefreshConfigValues, useUpdateConfigValues } from '../../context/ServiceConfigContext'
import Sprite from '../Sprite'
import styles from './FeeConfigModal.module.css'
import SegmentedTabs from '../SegmentedTabs'

const TX_FEES_BLOCKS_MIN = 1
const TX_FEES_BLOCKS_MAX = 999
const TX_FEES_SATSPERKILOVBYTE_MIN = 1_000
const TX_FEES_SATSPERKILOVBYTE_MAX = 100_000

// TODO: move to utils
const percentageToFactor = (val: number, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.0027 / 100 == 0.000027000000000000002
  // but: ✓ Number((0.0027 / 100).toFixed(6)) = 0.000027
  return Number((val / 100).toFixed(precision))
}

const factorToPercentage = (val: number, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
  // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
  return Number((val * 100).toFixed(precision))
}

const FEE_KEYS = {
  tx_fees: { section: 'POLICY', field: 'tx_fees' },
  tx_fees_factor: { section: 'POLICY', field: 'tx_fees_factor' },
  //{ section: 'POLICY', field: 'absurd_fee_per_kb' },
  //{ section: 'POLICY', field: 'max_sweep_fee_change' },
  max_cj_fee_abs: { section: 'POLICY', field: 'max_cj_fee_abs' },
  max_cj_fee_rel: { section: 'POLICY', field: 'max_cj_fee_rel' },
}

interface FeeConfigModalProps {
  show: boolean
  onHide: () => void
}

type TxFeeValueUnit = 'blocks' | 'sats/kilo-vbyte'

interface FeeValues {
  tx_fees?: number
  max_cj_fee_abs?: number
  max_cj_fee_rel?: number
}

interface FeeConfigFormProps {
  onSubmit: (values: FeeValues) => void
  validate: (values: FeeValues, feeValueUnit: TxFeeValueUnit) => FormikErrors<FeeValues>
  initialValues: FeeValues
}

const FeeConfigForm = forwardRef(
  ({ onSubmit, validate, initialValues }: FeeConfigFormProps, ref: React.Ref<HTMLFormElement>) => {
    const { t } = useTranslation()

    const [txFeesUnit, setTxFeesUnit] = useState<TxFeeValueUnit>(
      initialValues.tx_fees && initialValues.tx_fees > 1_000 ? 'sats/kilo-vbyte' : 'blocks'
    )

    const doValidate = useCallback((values: FeeValues) => validate(values, txFeesUnit), [validate, txFeesUnit])

    return (
      <Formik initialValues={initialValues} validate={doValidate} onSubmit={onSubmit}>
        {({
          handleSubmit,
          setFieldValue,
          handleChange,
          handleBlur,
          validateForm,
          values,
          touched,
          errors,
          isSubmitting,
        }) => (
          <rb.Form ref={ref} onSubmit={handleSubmit} noValidate>
            <rb.Form.Label>{t('settings.fees.label_tx_fees')}</rb.Form.Label>
            {txFeesUnit && (
              <rb.Form.Group className="mb-2 d-flex justify-content-center" controlId="offertype">
                <SegmentedTabs
                  name="txFeesUnit"
                  tabs={[
                    {
                      label: t('settings.fees.radio_tx_fees_blocks'),
                      value: 'blocks',
                    },
                    {
                      label: t('settings.fees.radio_tx_fees_satspervbyte'),
                      value: 'sats/kilo-vbyte',
                    },
                  ]}
                  onChange={(tab, checked) => {
                    const value = tab.value as TxFeeValueUnit
                    setTxFeesUnit(value)

                    if (values.tx_fees) {
                      if (value === 'sats/kilo-vbyte') {
                        setFieldValue('tx_fees', values.tx_fees * 1_000, false)
                      } else {
                        setFieldValue('tx_fees', Math.round(values.tx_fees / 1_000), false)
                      }
                    }
                    setTimeout(() => validateForm(), 4)
                  }}
                  initialValue={txFeesUnit}
                  disabled={isSubmitting}
                />
              </rb.Form.Group>
            )}
            <rb.Form.Text className="d-block mb-2 text-secondary">
              {t(
                txFeesUnit === 'sats/kilo-vbyte'
                  ? 'settings.fees.description_tx_fees_satspervbyte'
                  : 'settings.fees.description_tx_fees_blocks'
              )}
            </rb.Form.Text>
            <rb.Form.Group controlId="tx_fees" className="mb-4">
              <rb.InputGroup>
                <rb.InputGroup.Text id="txFees-addon1">
                  {txFeesUnit === 'sats/kilo-vbyte' ? (
                    <>
                      <Sprite symbol="sats" width="24" height="24" />/ vB
                    </>
                  ) : (
                    <>blocks</>
                  )}
                </rb.InputGroup.Text>

                {txFeesUnit === 'sats/kilo-vbyte' ? (
                  <rb.Form.Control
                    aria-label={t('settings.fees.label_tx_fees')}
                    className="slashed-zeroes"
                    name="tx_fees"
                    type="number"
                    placeholder="1"
                    value={values.tx_fees ? Number(values.tx_fees / 1_000) : values.tx_fees}
                    disabled={isSubmitting}
                    onBlur={handleBlur}
                    isValid={touched.tx_fees && !errors.tx_fees}
                    isInvalid={touched.tx_fees && !!errors.tx_fees}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setFieldValue('tx_fees', value * 1000, true)
                    }}
                    min={TX_FEES_SATSPERKILOVBYTE_MIN / 1000}
                    step={0.001}
                  />
                ) : (
                  <rb.Form.Control
                    aria-label={t('settings.fees.label_tx_fees')}
                    className="slashed-zeroes"
                    name="tx_fees"
                    type="number"
                    placeholder="1"
                    value={values.tx_fees}
                    disabled={isSubmitting}
                    onBlur={handleBlur}
                    isValid={touched.tx_fees && !errors.tx_fees}
                    isInvalid={touched.tx_fees && !!errors.tx_fees}
                    onChange={handleChange}
                    min={1}
                    max={999}
                    step={1}
                  />
                )}
                <rb.Form.Control.Feedback type="invalid">{errors.tx_fees}</rb.Form.Control.Feedback>
              </rb.InputGroup>
            </rb.Form.Group>

            <h6>{t('settings.fees.title_max_cj_fee')}</h6>
            <rb.Form.Text className="d-block mb-2 text-secondary">
              {t('settings.fees.subtitle_max_cj_fee')}
            </rb.Form.Text>
            <rb.Form.Group controlId="max_cj_fee_abs" className="mb-4">
              <rb.Form.Label>{t('settings.fees.label_max_cj_fee_abs')}</rb.Form.Label>
              <rb.Form.Text className="d-block mb-2 text-secondary">
                {t('settings.fees.description_max_cj_fee_abs')}
              </rb.Form.Text>
              <rb.InputGroup>
                <rb.InputGroup.Text id="maxCjFeeAbs-addon1" className={styles.inputGroupText}>
                  <Sprite symbol="sats" width="24" height="24" />
                </rb.InputGroup.Text>
                <rb.Form.Control
                  aria-label={t('settings.fees.label_max_cj_fee_abs')}
                  className="slashed-zeroes"
                  name="max_cj_fee_abs"
                  type="number"
                  placeholder="1"
                  value={values.max_cj_fee_abs}
                  disabled={isSubmitting}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  isValid={touched.max_cj_fee_abs && !errors.max_cj_fee_abs}
                  isInvalid={touched.max_cj_fee_abs && !!errors.max_cj_fee_abs}
                  min={1}
                  step={1_000}
                />
                <rb.Form.Control.Feedback type="invalid">{errors.max_cj_fee_abs}</rb.Form.Control.Feedback>
              </rb.InputGroup>
            </rb.Form.Group>

            <rb.Form.Group controlId="max_cj_fee_rel" className="mb-4">
              <rb.Form.Label>
                {t('settings.fees.label_max_cj_fee_rel', {
                  fee:
                    typeof values.max_cj_fee_rel === 'number' ? `(${factorToPercentage(values.max_cj_fee_rel)}%)` : '',
                })}
              </rb.Form.Label>
              <rb.Form.Text className="d-block mb-2 text-secondary">
                {t('settings.fees.description_max_cj_fee_rel')}
              </rb.Form.Text>
              <rb.InputGroup>
                <rb.InputGroup.Text id="maxCjFeeRel-addon1" className={styles.inputGroupText}>
                  %
                </rb.InputGroup.Text>
                <rb.Form.Control
                  aria-label={t('settings.fees.label_max_cj_fee_rel', {
                    fee:
                      typeof values.max_cj_fee_rel === 'number'
                        ? `(${factorToPercentage(values.max_cj_fee_rel)}%)`
                        : '',
                  })}
                  className="slashed-zeroes"
                  name="max_cj_fee_rel"
                  type="number"
                  placeholder="0"
                  value={values.max_cj_fee_rel && factorToPercentage(values.max_cj_fee_rel)}
                  disabled={isSubmitting}
                  onBlur={handleBlur}
                  isValid={touched.max_cj_fee_rel && !errors.max_cj_fee_rel}
                  isInvalid={touched.max_cj_fee_rel && !!errors.max_cj_fee_rel}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setFieldValue('max_cj_fee_rel', percentageToFactor(value), true)
                  }}
                  min={0.0001}
                  max={20}
                  step={0.0001}
                />
                <rb.Form.Control.Feedback type="invalid">{errors.max_cj_fee_rel}</rb.Form.Control.Feedback>
              </rb.InputGroup>
            </rb.Form.Group>
          </rb.Form>
        )}
      </Formik>
    )
  }
)

export default function FeeConfigModal({ show, onHide }: FeeConfigModalProps) {
  const { t } = useTranslation()
  const refreshConfigValues = useRefreshConfigValues()
  const updateConfigValues = useUpdateConfigValues()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [txFeesFactor, setTxFeesFactor] = useState<number>(0)
  const minTxFeesInSatsPerKiloVByte = useMemo(
    () => TX_FEES_SATSPERKILOVBYTE_MIN + TX_FEES_SATSPERKILOVBYTE_MIN * txFeesFactor,
    [txFeesFactor]
  )
  const [feeConfigValues, setFeeConfigValues] = useState<FeeValues | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const loadFeeValues = async (signal: AbortSignal) => {
      setIsLoading(true)

      try {
        const serviceConfig = await refreshConfigValues({
          signal,
          keys: Object.values(FEE_KEYS),
        })

        setIsLoading(false)

        const policy = serviceConfig['POLICY'] || {}
        setTxFeesFactor(parseFloat(policy.tx_fees_factor || '0'))

        const feeValues: FeeValues = {
          tx_fees: parseInt(policy.tx_fees || '', 10) || undefined,
          max_cj_fee_abs: parseInt(policy.max_cj_fee_abs || '', 10) || undefined,
          max_cj_fee_rel: parseFloat(policy.max_cj_fee_rel || '') || undefined,
        }
        setFeeConfigValues(feeValues)
      } catch (e) {
        if (!signal.aborted) {
          setIsLoading(false)
          setLoadError(true)
        }
      }
    }

    const abortCtrl = new AbortController()
    if (show) {
      loadFeeValues(abortCtrl.signal)
    }

    return () => {
      abortCtrl.abort()
    }
  }, [show, refreshConfigValues])

  const validate = useCallback(
    (values: FeeValues, txFeesUnit: TxFeeValueUnit) => {
      const errors = {} as FormikErrors<FeeValues>

      if (txFeesUnit === 'sats/kilo-vbyte') {
        if (
          !values.tx_fees ||
          values.tx_fees < minTxFeesInSatsPerKiloVByte ||
          values.tx_fees > TX_FEES_SATSPERKILOVBYTE_MAX
        ) {
          errors.tx_fees = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
            min: minTxFeesInSatsPerKiloVByte / 1_000,
            max: TX_FEES_SATSPERKILOVBYTE_MAX / 1_000,
          })
        }
      } else {
        if (!values.tx_fees || values.tx_fees < TX_FEES_BLOCKS_MIN || values.tx_fees > TX_FEES_BLOCKS_MAX) {
          errors.tx_fees = t('settings.fees.feedback_invalid_tx_fees_blocks', {
            min: TX_FEES_BLOCKS_MIN,
            max: TX_FEES_BLOCKS_MAX,
          })
        }
      }

      if (!values.max_cj_fee_abs) {
        errors.max_cj_fee_abs = t('settings.fees.feedback_invalid_max_cj_fee_abs')
      }
      if (!values.max_cj_fee_rel) {
        errors.max_cj_fee_rel = t('settings.fees.feedback_invalid_max_cj_fee_rel')
      }
      return errors
    },
    [t, minTxFeesInSatsPerKiloVByte]
  )

  const cancel = () => {
    onHide()
  }

  const confirm = async (feeValues: FeeValues) => {
    const allValuesPresent = Object.values(feeValues).every((it) => it !== undefined)
    if (!allValuesPresent) return

    const updates = [
      {
        key: FEE_KEYS.tx_fees,
        value: String(feeValues.tx_fees),
      },
      {
        key: FEE_KEYS.max_cj_fee_abs,
        value: String(feeValues.max_cj_fee_abs),
      },
      {
        key: FEE_KEYS.max_cj_fee_rel,
        value: String(feeValues.max_cj_fee_rel),
      },
    ]

    try {
      await updateConfigValues({
        updates,
      })
      onHide()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <rb.Modal
      className={styles.feeConfigModal}
      size="lg"
      show={show}
      onHide={onHide}
      keyboard={false}
      centered={true}
      animation={true}
    >
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('settings.fees.title')}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        <>
          {isLoading && (
            <div className="d-flex justify-content-center align-items-center">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            </div>
          )}
          {loadError && (
            <div className="text-danger" style={{ marginLeft: '1rem' }}>
              {t('settings.fees.error_loading_fee_config_failed')}
            </div>
          )}
          {feeConfigValues && (
            <>
              <div className="mb-4 small">{t('settings.fees.description')}</div>
              <FeeConfigForm ref={formRef} onSubmit={confirm} validate={validate} initialValues={feeConfigValues} />
            </>
          )}
        </>
      </rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        <rb.Button variant="light" onClick={cancel} className="d-flex justify-content-center align-items-center">
          {t('settings.fees.text_button_cancel')}
        </rb.Button>
        <rb.Button variant="dark" type="submit" disabled={isLoading} onClick={() => formRef.current?.requestSubmit()}>
          {t('settings.fees.text_button_submit')}
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}
