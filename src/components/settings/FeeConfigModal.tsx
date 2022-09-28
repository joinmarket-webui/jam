import { forwardRef, useRef, useCallback, useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import { useRefreshConfigValues, useUpdateConfigValues } from '../../context/ServiceConfigContext'
import Sprite from '../Sprite'
import styles from './FeeConfigModal.module.css'
import SegmentedTabs from '../SegmentedTabs'

type SatsPerKiloVByte = number

const TX_FEES_BLOCKS_MIN = 1
const TX_FEES_BLOCKS_MAX = 1_000
const TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE: SatsPerKiloVByte = 1_000 // 1 sat/vbyte
const TX_FEES_SATSPERKILOVBYTE_MAX: SatsPerKiloVByte = 100_000 // 100 sats/vbyte - no enforcement by JM - this should be a "sane" max value
const TX_FEES_FACTOR_DEFAULT_VAL = 0.2 // 20%
const TX_FEES_FACTOR_MIN = 0.1 // 10% - no enforcement by JM - this should be a "sane" min value
const TX_FEES_FACTOR_MAX = 1 // 100%
const CJ_FEE_REL_MIN = 0.000001 // 0.0001%
const CJ_FEE_REL_MAX = 0.5 // 50% - no enforcement by JM - this should be a "sane" max value

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

const calcMinTxFeeValue = (txFeeFactor: number): SatsPerKiloVByte => {
  return TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE + TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE * txFeeFactor
}

const isValidNumber = (val: number | undefined) => typeof val === 'number' && !isNaN(val)

const FEE_KEYS = {
  tx_fees: { section: 'POLICY', field: 'tx_fees' },
  tx_fees_factor: { section: 'POLICY', field: 'tx_fees_factor' },
  max_cj_fee_abs: { section: 'POLICY', field: 'max_cj_fee_abs' },
  max_cj_fee_rel: { section: 'POLICY', field: 'max_cj_fee_rel' },
  // TODO: Should these values be also exposed?
  //{ section: 'POLICY', field: 'absurd_fee_per_kb' },
  //{ section: 'POLICY', field: 'max_sweep_fee_change' },
}

interface FeeConfigModalProps {
  show: boolean
  onHide: () => void
}

type TxFeeValueUnit = 'blocks' | 'sats/kilo-vbyte'

interface FeeValues {
  tx_fees?: number
  tx_fees_factor?: number
  max_cj_fee_abs?: number
  max_cj_fee_rel?: number
}

interface FeeConfigFormProps {
  initialValues: FeeValues
  validate: (values: FeeValues, txFeesUnit: TxFeeValueUnit) => FormikErrors<FeeValues>
  onSubmit: (values: FeeValues) => void
}

const FeeConfigForm = forwardRef(
  ({ onSubmit, validate, initialValues }: FeeConfigFormProps, ref: React.Ref<HTMLFormElement>) => {
    const { t } = useTranslation()

    const [txFeesUnit, setTxFeesUnit] = useState<TxFeeValueUnit>(
      initialValues.tx_fees && initialValues.tx_fees > 1_000 ? 'sats/kilo-vbyte' : 'blocks'
    )

    return (
      <Formik initialValues={initialValues} validate={(values) => validate(values, txFeesUnit)} onSubmit={onSubmit}>
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
            <rb.Accordion flush>
              <rb.Accordion.Item eventKey="0">
                <rb.Accordion.Header>{t('settings.fees.title_general_fee_settings')}</rb.Accordion.Header>
                <rb.Accordion.Body>
                  <rb.Form.Label>{t('settings.fees.label_tx_fees')}</rb.Form.Label>
                  {txFeesUnit && (
                    <rb.Form.Group className="my-2 d-flex justify-content-center" controlId="offertype">
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
                        onChange={(tab) => {
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
                  <rb.Form.Text>
                    {t(
                      txFeesUnit === 'sats/kilo-vbyte'
                        ? 'settings.fees.description_tx_fees_satspervbyte'
                        : 'settings.fees.description_tx_fees_blocks'
                    )}
                  </rb.Form.Text>
                  <rb.Form.Group controlId="tx_fees" className="mb-4">
                    <rb.InputGroup hasValidation>
                      <rb.InputGroup.Text id="txFees-addon1">
                        {txFeesUnit === 'sats/kilo-vbyte' ? (
                          <>
                            <Sprite symbol="sats" width="24" height="24" />/ vB
                          </>
                        ) : (
                          <Sprite symbol="block" width="24" height="24" name="Block" />
                        )}
                      </rb.InputGroup.Text>

                      {txFeesUnit === 'sats/kilo-vbyte' ? (
                        <rb.Form.Control
                          aria-label={t('settings.fees.label_tx_fees')}
                          className="slashed-zeroes"
                          name="tx_fees"
                          type="number"
                          placeholder="1"
                          value={isValidNumber(values.tx_fees) ? values.tx_fees! / 1_000 : ''}
                          disabled={isSubmitting}
                          onBlur={handleBlur}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            setFieldValue('tx_fees', value * 1_000, true)
                          }}
                          isValid={touched.tx_fees && !errors.tx_fees}
                          isInvalid={touched.tx_fees && !!errors.tx_fees}
                          min={TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE / 1_000}
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
                          onChange={handleChange}
                          isValid={touched.tx_fees && !errors.tx_fees}
                          isInvalid={touched.tx_fees && !!errors.tx_fees}
                          min={1}
                          max={999}
                          step={1}
                        />
                      )}
                      <rb.Form.Control.Feedback type="invalid">{errors.tx_fees}</rb.Form.Control.Feedback>
                    </rb.InputGroup>
                  </rb.Form.Group>

                  <rb.Form.Group controlId="tx_fees_factor" className="mb-4">
                    <rb.Form.Label>
                      {t('settings.fees.label_tx_fees_factor', {
                        fee: isValidNumber(values.tx_fees_factor)
                          ? `(${factorToPercentage(values.tx_fees_factor!)}%)`
                          : '',
                      })}
                    </rb.Form.Label>
                    <rb.Form.Text>{t('settings.fees.description_tx_fees_factor')}</rb.Form.Text>
                    <rb.InputGroup hasValidation>
                      <rb.InputGroup.Text id="txFeesFactor-addon1" className={styles.inputGroupText}>
                        %
                      </rb.InputGroup.Text>
                      <rb.Form.Control
                        aria-label={t('settings.fees.label_tx_fees_factor', {
                          fee: isValidNumber(values.tx_fees_factor)
                            ? `(${factorToPercentage(values.tx_fees_factor!)}%)`
                            : '',
                        })}
                        className="slashed-zeroes"
                        name="tx_fees_factor"
                        type="number"
                        placeholder="0"
                        value={isValidNumber(values.tx_fees_factor) ? factorToPercentage(values.tx_fees_factor!) : ''}
                        disabled={isSubmitting}
                        onBlur={handleBlur}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value)
                          setFieldValue('tx_fees_factor', percentageToFactor(value), true)
                        }}
                        isValid={touched.tx_fees_factor && !errors.tx_fees_factor}
                        isInvalid={touched.tx_fees_factor && !!errors.tx_fees_factor}
                        min={factorToPercentage(TX_FEES_FACTOR_MIN)}
                        max={factorToPercentage(TX_FEES_FACTOR_MAX)}
                        step={0.01}
                      />
                      <rb.Form.Control.Feedback type="invalid">{errors.tx_fees_factor}</rb.Form.Control.Feedback>
                    </rb.InputGroup>
                  </rb.Form.Group>
                </rb.Accordion.Body>
              </rb.Accordion.Item>
              <rb.Accordion.Item eventKey="1">
                <rb.Accordion.Header>{t('settings.fees.title_max_cj_fee_settings')}</rb.Accordion.Header>
                <rb.Accordion.Body>
                  <rb.Form.Text className="d-block mb-4">{t('settings.fees.subtitle_max_cj_fee')}</rb.Form.Text>
                  <rb.Form.Group controlId="max_cj_fee_abs" className="mb-4">
                    <rb.Form.Label>{t('settings.fees.label_max_cj_fee_abs')}</rb.Form.Label>
                    <rb.Form.Text>{t('settings.fees.description_max_cj_fee_abs')}</rb.Form.Text>
                    <rb.InputGroup hasValidation>
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
                        onBlur={handleBlur}
                        onChange={handleChange}
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
                        fee: isValidNumber(values.max_cj_fee_rel)
                          ? `(${factorToPercentage(values.max_cj_fee_rel!)}%)`
                          : '',
                      })}
                    </rb.Form.Label>
                    <rb.Form.Text>{t('settings.fees.description_max_cj_fee_rel')}</rb.Form.Text>
                    <rb.InputGroup hasValidation>
                      <rb.InputGroup.Text id="maxCjFeeRel-addon1" className={styles.inputGroupText}>
                        %
                      </rb.InputGroup.Text>
                      <rb.Form.Control
                        aria-label={t('settings.fees.label_max_cj_fee_rel', {
                          fee: isValidNumber(values.max_cj_fee_rel)
                            ? `(${factorToPercentage(values.max_cj_fee_rel!)}%)`
                            : '',
                        })}
                        className="slashed-zeroes"
                        name="max_cj_fee_rel"
                        type="number"
                        placeholder="0"
                        value={isValidNumber(values.max_cj_fee_rel) ? factorToPercentage(values.max_cj_fee_rel!) : ''}
                        disabled={isSubmitting}
                        onBlur={handleBlur}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value)
                          setFieldValue('max_cj_fee_rel', percentageToFactor(value), true)
                        }}
                        isValid={touched.max_cj_fee_rel && !errors.max_cj_fee_rel}
                        isInvalid={touched.max_cj_fee_rel && !!errors.max_cj_fee_rel}
                        min={factorToPercentage(CJ_FEE_REL_MIN)}
                        max={factorToPercentage(CJ_FEE_REL_MAX)}
                        step={0.0001}
                      />
                      <rb.Form.Control.Feedback type="invalid">{errors.max_cj_fee_rel}</rb.Form.Control.Feedback>
                    </rb.InputGroup>
                  </rb.Form.Group>
                </rb.Accordion.Body>
              </rb.Accordion.Item>
            </rb.Accordion>
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | undefined>(undefined)
  const [feeConfigValues, setFeeConfigValues] = useState<FeeValues | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const loadFeeValues = async (signal: AbortSignal) => {
      setLoadError(false)
      setIsLoading(true)

      try {
        const serviceConfig = await refreshConfigValues({
          signal,
          keys: Object.values(FEE_KEYS),
        })

        setIsLoading(false)

        const policy = serviceConfig['POLICY'] || {}

        const feeValues: FeeValues = {
          tx_fees: parseInt(policy.tx_fees || '', 10) || undefined,
          tx_fees_factor: parseFloat(policy.tx_fees_factor || `${TX_FEES_FACTOR_DEFAULT_VAL}`),
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
    } else {
      setLoadError(false)
      setSaveErrorMessage(undefined)
    }

    return () => {
      abortCtrl.abort()
    }
  }, [show, refreshConfigValues])

  const submit = async (feeValues: FeeValues) => {
    const allValuesPresent = Object.values(feeValues).every((it) => it !== undefined)
    if (!allValuesPresent) return

    setSaveErrorMessage(undefined)

    const updates = [
      {
        key: FEE_KEYS.tx_fees,
        value: String(feeValues.tx_fees),
      },
      {
        key: FEE_KEYS.tx_fees_factor,
        value: String(feeValues.tx_fees_factor),
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

    setIsSubmitting(true)
    try {
      await updateConfigValues({ updates })

      setIsSubmitting(false)
      onHide()
    } catch (err) {
      setIsSubmitting(false)
      setSaveErrorMessage(
        t('settings.fees.error_saving_fee_config_failed', {
          reason: err instanceof Error ? err.message : 'Unknown',
        })
      )
    }
  }

  const validate = useCallback(
    (values: FeeValues, txFeesUnit: TxFeeValueUnit) => {
      const errors = {} as FormikErrors<FeeValues>

      let minTxFeesInSatsPerKiloVByte = TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE
      if (
        !isValidNumber(values.tx_fees_factor) ||
        values.tx_fees_factor! < TX_FEES_FACTOR_MIN ||
        values.tx_fees_factor! > TX_FEES_FACTOR_MAX
      ) {
        errors.tx_fees_factor = t('settings.fees.feedback_invalid_tx_fees_factor', {
          min: `${factorToPercentage(TX_FEES_FACTOR_MIN)}%`,
          max: `${factorToPercentage(TX_FEES_FACTOR_MAX)}%`,
        })
      } else {
        minTxFeesInSatsPerKiloVByte = calcMinTxFeeValue(values.tx_fees_factor!)
      }

      if (txFeesUnit === 'sats/kilo-vbyte') {
        if (
          !isValidNumber(values.tx_fees) ||
          values.tx_fees! <= TX_FEES_SATSPERKILOVBYTE_MIN_EXCLUSIVE ||
          values.tx_fees! < minTxFeesInSatsPerKiloVByte ||
          values.tx_fees! > TX_FEES_SATSPERKILOVBYTE_MAX
        ) {
          errors.tx_fees = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
            min: (minTxFeesInSatsPerKiloVByte / 1_000).toLocaleString(undefined, {
              maximumFractionDigits: Math.log10(1_000),
            }),
            max: (TX_FEES_SATSPERKILOVBYTE_MAX / 1_000).toLocaleString(undefined, {
              maximumFractionDigits: Math.log10(1_000),
            }),
          })
        }
      } else {
        if (
          !isValidNumber(values.tx_fees) ||
          values.tx_fees! < TX_FEES_BLOCKS_MIN ||
          values.tx_fees! > TX_FEES_BLOCKS_MAX
        ) {
          errors.tx_fees = t('settings.fees.feedback_invalid_tx_fees_blocks', {
            min: TX_FEES_BLOCKS_MIN.toLocaleString(),
            max: TX_FEES_BLOCKS_MAX.toLocaleString(),
          })
        }
      }

      if (!isValidNumber(values.max_cj_fee_abs) || values.max_cj_fee_abs! <= 0) {
        errors.max_cj_fee_abs = t('settings.fees.feedback_invalid_max_cj_fee_abs')
      }
      if (
        !isValidNumber(values.max_cj_fee_rel) ||
        values.max_cj_fee_rel! <= CJ_FEE_REL_MIN ||
        values.max_cj_fee_rel! > CJ_FEE_REL_MAX
      ) {
        errors.max_cj_fee_rel = t('settings.fees.feedback_invalid_max_cj_fee_rel', {
          min: `${factorToPercentage(CJ_FEE_REL_MIN)}%`,
          max: `${factorToPercentage(CJ_FEE_REL_MAX)}%`,
        })
      }
      return errors
    },
    [t]
  )

  const cancel = () => {
    onHide()
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
          <div className="mb-4 small">{t('settings.fees.description')}</div>
          {loadError && (
            <rb.Alert variant="danger" className="w-100">
              {t('settings.fees.error_loading_fee_config_failed')}
            </rb.Alert>
          )}
          {isLoading ? (
            <>
              {Array(2)
                .fill('')
                .map((_, index) => {
                  return (
                    <rb.Placeholder key={index} as="div" animation="wave">
                      <rb.Placeholder xs={12} className={styles.accordionLoader} />
                    </rb.Placeholder>
                  )
                })}
            </>
          ) : (
            <>
              {feeConfigValues && (
                <FeeConfigForm ref={formRef} initialValues={feeConfigValues} validate={validate} onSubmit={submit} />
              )}
            </>
          )}
        </>
      </rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        {saveErrorMessage && (
          <rb.Alert variant="danger" className="w-100">
            {saveErrorMessage}
          </rb.Alert>
        )}
        <div className={styles.buttonContainer}>
          <rb.Button variant="light" onClick={cancel} className="d-flex justify-content-center align-items-center">
            {t('settings.fees.text_button_cancel')}
          </rb.Button>
          <rb.Button
            variant="dark"
            type="submit"
            className="d-flex justify-content-center align-items-center"
            disabled={isLoading || isSubmitting}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {isSubmitting ? (
              <>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('settings.fees.text_button_submitting')}
              </>
            ) : (
              t('settings.fees.text_button_submit')
            )}
          </rb.Button>
        </div>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}
