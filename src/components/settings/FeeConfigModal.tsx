import { forwardRef, useRef, useCallback, useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import classNames from 'classnames'
import { FEE_CONFIG_KEYS, TxFeeValueUnit, toTxFeeValueUnit, FeeValues, useLoadFeeConfigValues } from '../../hooks/Fees'
import { useUpdateConfigValues } from '../../context/ServiceConfigContext'
import { isValidNumber, factorToPercentage, percentageToFactor } from '../../utils'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'
import styles from './FeeConfigModal.module.css'

type SatsPerKiloVByte = number

const TX_FEES_BLOCKS_MIN = 1
const TX_FEES_BLOCKS_MAX = 1_000

/**
 * When the fee target is low, JM sometimes constructs transactions, which are
 * declined from being relayed. In order to mitigate such situations, the
 * minimum fee target (when provided in sats/vbyte) must be higher than
 * 1 sats/vbyte, till the problem is addressed. Once resolved, this
 * can be lowered to 1 sats/vbyte again.
 * See https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1360#issuecomment-1262295463
 * Last checked on 2022-10-06.
 */
const TX_FEES_SATSPERKILOVBYTE_MIN: SatsPerKiloVByte = 1_000 // 1 sat/vbyte
// 350 sats/vbyte - no enforcement by JM - this should be a "sane" max value (taken default value of "absurd_fee_per_kb")
const TX_FEES_SATSPERKILOVBYTE_MAX: SatsPerKiloVByte = 350_000
const TX_FEES_SATSPERKILOVBYTE_ADJUSTED_MIN = 1_001 // actual min of `tx_fees` if unit is sats/kilo-vbyte
const TX_FEES_FACTOR_MIN = 0 // 0%
/**
 * For the same reasons as stated above (comment for `TX_FEES_SATSPERKILOVBYTE_MIN`),
 * the maximum randomization factor must not be too high.
 * Settling on 50% as a reasonable compromise until this problem is addressed.
 * Once resolved, this can be set to 100% again.
 */
const TX_FEES_FACTOR_MAX = 0.5 // 50%
const CJ_FEE_ABS_MIN = 1
const CJ_FEE_ABS_MAX = 1_000_000 // 0.01 BTC - no enforcement by JM - this should be a "sane" max value
const CJ_FEE_REL_MIN = 0.000001 // 0.0001%
const CJ_FEE_REL_MAX = 0.05 // 5% - no enforcement by JM - this should be a "sane" max value

interface FeeConfigModalProps {
  show: boolean
  onHide: () => void
}

interface FeeConfigFormProps {
  initialValues: FeeValues
  validate: (values: FeeValues, txFeesUnit: TxFeeValueUnit) => FormikErrors<FeeValues>
  onSubmit: (values: FeeValues, txFeesUnit: TxFeeValueUnit) => void
}

const FeeConfigForm = forwardRef(
  ({ onSubmit, validate, initialValues }: FeeConfigFormProps, ref: React.Ref<HTMLFormElement>) => {
    const { t, i18n } = useTranslation()

    const [txFeesUnit, setTxFeesUnit] = useState<TxFeeValueUnit>(toTxFeeValueUnit(initialValues.tx_fees) || 'blocks')

    return (
      <Formik
        initialValues={initialValues}
        validate={(values) => validate(values, txFeesUnit)}
        onSubmit={(values) => onSubmit(values, txFeesUnit)}
      >
        {({ handleSubmit, setFieldValue, handleBlur, validateForm, values, touched, errors, isSubmitting }) => (
          <rb.Form ref={ref} onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
            <rb.Accordion flush>
              <rb.Accordion.Item eventKey="0">
                <rb.Accordion.Header>
                  <span
                    className={classNames({
                      'text-danger': !!errors.tx_fees || !!errors.tx_fees_factor,
                    })}
                  >
                    {t('settings.fees.title_general_fee_settings')}
                  </span>
                </rb.Accordion.Header>
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
                          min={TX_FEES_SATSPERKILOVBYTE_MIN / 1_000}
                          max={TX_FEES_SATSPERKILOVBYTE_MAX / 1_000}
                          step={0.001}
                        />
                      ) : (
                        <rb.Form.Control
                          aria-label={t('settings.fees.label_tx_fees')}
                          className="slashed-zeroes"
                          name="tx_fees"
                          type="number"
                          placeholder="1"
                          value={isValidNumber(values.tx_fees) ? values.tx_fees : ''}
                          disabled={isSubmitting}
                          onBlur={handleBlur}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            setFieldValue('tx_fees', value, true)
                          }}
                          isValid={touched.tx_fees && !errors.tx_fees}
                          isInvalid={touched.tx_fees && !!errors.tx_fees}
                          min={TX_FEES_BLOCKS_MIN}
                          max={TX_FEES_BLOCKS_MAX}
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
                <rb.Accordion.Header>
                  <span
                    className={classNames({
                      'text-danger': !!errors.max_cj_fee_abs || !!errors.max_cj_fee_rel,
                    })}
                  >
                    {t('settings.fees.title_max_cj_fee_settings')}
                  </span>
                </rb.Accordion.Header>
                <rb.Accordion.Body>
                  <rb.Form.Text className="d-flex align-items-center mb-4">
                    <Sprite className={classNames(styles.infoIcon, 'me-1')} symbol="info" width="18" height="18" />
                    {t('settings.fees.subtitle_max_cj_fee')}
                  </rb.Form.Text>
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
                        value={isValidNumber(values.max_cj_fee_abs) ? values.max_cj_fee_abs : ''}
                        disabled={isSubmitting}
                        onBlur={handleBlur}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          setFieldValue('max_cj_fee_abs', value, true)
                        }}
                        isValid={touched.max_cj_fee_abs && !errors.max_cj_fee_abs}
                        isInvalid={touched.max_cj_fee_abs && !!errors.max_cj_fee_abs}
                        min={CJ_FEE_ABS_MIN}
                        max={CJ_FEE_ABS_MAX}
                        step={1}
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
                        aria-label={t('settings.fees.label_max_cj_fee_rel')}
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
  const updateConfigValues = useUpdateConfigValues()
  const loadFeeConfigValues = useLoadFeeConfigValues()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | undefined>(undefined)
  const [feeConfigValues, setFeeConfigValues] = useState<FeeValues | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setLoadError(false)

    const abortCtrl = new AbortController()
    if (show) {
      setIsLoading(true)

      loadFeeConfigValues(abortCtrl.signal)
        .then((val) => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
          setFeeConfigValues(val)
        })
        .catch((e) => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
          setLoadError(true)
        })
    } else {
      setSaveErrorMessage(undefined)
    }

    return () => {
      abortCtrl.abort()
    }
  }, [show, loadFeeConfigValues])

  const submit = async (feeValues: FeeValues, txFeesUnit: TxFeeValueUnit) => {
    const allValuesPresent = Object.values(feeValues).every((it) => it !== undefined)
    if (!allValuesPresent) return

    let adjustedTxFees = feeValues.tx_fees!
    if (txFeesUnit === 'sats/kilo-vbyte') {
      // There is one special case for value `tx_fees`:
      // Users are allowed to specify the value in "sats/vbyte", but this might
      // be interpreted by JM as "targeted blocks". This adaption makes sure
      // that it is in fact closer to what the user actually expects, albeit it
      // can be surprising that the value is slightly different as specified.
      adjustedTxFees = Math.max(adjustedTxFees, TX_FEES_SATSPERKILOVBYTE_ADJUSTED_MIN)
    }

    const updates = [
      {
        key: FEE_CONFIG_KEYS.tx_fees,
        value: String(adjustedTxFees),
      },
      {
        key: FEE_CONFIG_KEYS.tx_fees_factor,
        value: String(feeValues.tx_fees_factor),
      },
      {
        key: FEE_CONFIG_KEYS.max_cj_fee_abs,
        value: String(feeValues.max_cj_fee_abs),
      },
      {
        key: FEE_CONFIG_KEYS.max_cj_fee_rel,
        value: String(feeValues.max_cj_fee_rel),
      },
    ]

    setSaveErrorMessage(undefined)
    setIsSubmitting(true)
    try {
      await updateConfigValues({ updates })

      setIsSubmitting(false)
      onHide()
    } catch (err) {
      setIsSubmitting(false)
      setSaveErrorMessage((_) =>
        t('settings.fees.error_saving_fee_config_failed', {
          reason: err instanceof Error ? err.message : 'Unknown',
        })
      )
    }
  }

  const validate = useCallback(
    (values: FeeValues, txFeesUnit: TxFeeValueUnit) => {
      const errors = {} as FormikErrors<FeeValues>

      if (
        !isValidNumber(values.tx_fees_factor) ||
        values.tx_fees_factor! < TX_FEES_FACTOR_MIN ||
        values.tx_fees_factor! > TX_FEES_FACTOR_MAX
      ) {
        errors.tx_fees_factor = t('settings.fees.feedback_invalid_tx_fees_factor', {
          min: `${factorToPercentage(TX_FEES_FACTOR_MIN)}%`,
          max: `${factorToPercentage(TX_FEES_FACTOR_MAX)}%`,
        })
      }

      if (txFeesUnit === 'sats/kilo-vbyte') {
        if (
          !isValidNumber(values.tx_fees) ||
          values.tx_fees! < TX_FEES_SATSPERKILOVBYTE_MIN ||
          values.tx_fees! > TX_FEES_SATSPERKILOVBYTE_MAX
        ) {
          errors.tx_fees = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
            min: (TX_FEES_SATSPERKILOVBYTE_MIN / 1_000).toLocaleString(undefined, {
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

      if (
        !isValidNumber(values.max_cj_fee_abs) ||
        values.max_cj_fee_abs! < CJ_FEE_ABS_MIN ||
        values.max_cj_fee_abs! > CJ_FEE_ABS_MAX
      ) {
        errors.max_cj_fee_abs = t('settings.fees.feedback_invalid_max_cj_fee_abs', {
          min: CJ_FEE_ABS_MIN.toLocaleString(),
          max: CJ_FEE_ABS_MAX.toLocaleString(),
        })
      }

      if (
        !isValidNumber(values.max_cj_fee_rel) ||
        values.max_cj_fee_rel! < CJ_FEE_REL_MIN ||
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
          <div className="mb-4 small">
            <Trans i18nKey="settings.fees.description">
              Fee description. See
              <a
                href="https://jamdocs.org/market/fees/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-dark"
              >
                this link
              </a>
              for more information.
            </Trans>
          </div>
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
