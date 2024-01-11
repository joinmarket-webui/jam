import { forwardRef, useRef, useCallback, useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Formik, FormikErrors, FormikProps, Field } from 'formik'
import classNames from 'classnames'
import Sprite from '../Sprite'
import { TxFeeInputField, validateTxFee } from './TxFeeInputField'
import { FEE_CONFIG_KEYS, FeeValues, useLoadFeeConfigValues } from '../../hooks/Fees'
import { useUpdateConfigValues } from '../../context/ServiceConfigContext'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import ToggleSwitch from '../ToggleSwitch'
import { isValidNumber, factorToPercentage, percentageToFactor } from '../../utils'
import styles from './FeeConfigModal.module.css'
import BitcoinAmountInput, { AmountValue, toAmountValue } from '../BitcoinAmountInput'

const __dev_allowFeeValuesReset = isDebugFeatureEnabled('allowFeeValuesReset')

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
  onSuccess?: () => void
  onCancel?: () => void
  defaultActiveSectionKey?: FeeConfigSectionKey
}

export type FeeConfigSectionKey = 'tx_fee' | 'cj_fee'
const TX_FEE_SECTION_KEY: FeeConfigSectionKey = 'tx_fee'
const CJ_FEE_SECTION_KEY: FeeConfigSectionKey = 'cj_fee'

type FeeFormValues = Pick<FeeValues, 'tx_fees' | 'tx_fees_factor' | 'max_cj_fee_rel'> & {
  max_cj_fee_abs?: AmountValue
  enableValidation?: boolean
}

interface FeeConfigFormProps {
  initialValues: FeeFormValues
  validate: (values: FeeFormValues) => FormikErrors<FeeFormValues>
  onSubmit: (values: FeeFormValues) => void
  defaultActiveSectionKey?: FeeConfigSectionKey
}

const FeeConfigForm = forwardRef(
  (
    { onSubmit, validate, initialValues, defaultActiveSectionKey }: FeeConfigFormProps,
    ref: React.Ref<FormikProps<FeeFormValues>>,
  ) => {
    const { t, i18n } = useTranslation()

    return (
      <Formik
        innerRef={ref}
        initialValues={initialValues}
        validate={(values) => validate(values)}
        onSubmit={(values) => onSubmit(values)}
      >
        {(props) => {
          const { handleSubmit, setFieldValue, handleBlur, values, touched, errors, isSubmitting } = props

          const maxCjFeeAbsField = props.getFieldProps<AmountValue>('max_cj_fee_abs')
          return (
            <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
              {__dev_allowFeeValuesReset && (
                <div className="mb-4">
                  <ToggleSwitch
                    label={
                      <>
                        Enable form validation
                        <span className="ms-2 badge rounded-pill bg-warning">dev</span>
                      </>
                    }
                    subtitle={
                      'Ability to reset fee values to test what the UI looks like, when a user does not have these values configured.'
                    }
                    toggledOn={values.enableValidation ?? true}
                    onToggle={(isToggled) => {
                      setFieldValue('enableValidation', isToggled, true)
                    }}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <rb.Accordion flush defaultActiveKey={defaultActiveSectionKey}>
                <rb.Accordion.Item eventKey={CJ_FEE_SECTION_KEY}>
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
                    <div className="mb-4 text-secondary">{t('settings.fees.description_max_cj_fee_settings')}</div>
                    <rb.Form.Text className="d-flex align-items-center mb-4 fw-bold">
                      <Sprite className="rounded-circle border border-1 me-2" symbol="info" width="18" height="18" />
                      <Trans parent="div" i18nKey="settings.fees.subtitle_max_cj_fee" />
                    </rb.Form.Text>
                    <rb.Form.Group controlId="max_cj_fee_abs" className="mb-4">
                      <rb.Form.Label>{t('settings.fees.label_max_cj_fee_abs')}</rb.Form.Label>
                      <rb.Form.Text>{t('settings.fees.description_max_cj_fee_abs')}</rb.Form.Text>

                      <div className={touched.max_cj_fee_abs && !!errors.max_cj_fee_abs ? 'is-invalid' : ''}>
                        <BitcoinAmountInput
                          inputGroupTextClassName={styles.inputGroupText}
                          label={t('settings.fees.label_max_cj_fee_abs')}
                          placeholder={'1'}
                          field={maxCjFeeAbsField}
                          form={props}
                          disabled={isSubmitting}
                        />
                      </div>
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
                <rb.Accordion.Item eventKey={TX_FEE_SECTION_KEY}>
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
                    <div className="mb-4 text-secondary">{t('settings.fees.description_general_fee_settings')}</div>

                    <Field name="tx_fees" label={t('settings.fees.label_tx_fees')} component={TxFeeInputField} />

                    <rb.Form.Group controlId="tx_fees_factor" className="mb-4">
                      <rb.Form.Label>
                        {t('settings.fees.label_tx_fees_factor', {
                          fee: isValidNumber(values.tx_fees_factor)
                            ? `(${factorToPercentage(values.tx_fees_factor!)}%)`
                            : '',
                        })}
                      </rb.Form.Label>
                      <rb.Form.Text>{t('settings.fees.description_tx_fees_factor_^0.9.10')}</rb.Form.Text>
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
              </rb.Accordion>
            </rb.Form>
          )
        }}
      </Formik>
    )
  },
)

export default function FeeConfigModal({
  show,
  onHide,
  onSuccess,
  onCancel,
  defaultActiveSectionKey,
}: FeeConfigModalProps) {
  const { t } = useTranslation()
  const updateConfigValues = useUpdateConfigValues()
  const loadFeeConfigValues = useLoadFeeConfigValues()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<any>()
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>()
  const [feeFormValues, setFeeFormValues] = useState<FeeFormValues>()
  const formRef = useRef<FormikProps<FeeFormValues>>(null)

  useEffect(() => {
    setLoadError(undefined)

    const abortCtrl = new AbortController()
    if (show) {
      setIsLoading(true)

      loadFeeConfigValues(abortCtrl.signal)
        .then((val) => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
          setFeeFormValues({
            ...val,
            max_cj_fee_abs: val.max_cj_fee_abs !== undefined ? toAmountValue(val.max_cj_fee_abs) : undefined,
          })
        })
        .catch((error) => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
          setLoadError(error)
        })
    } else {
      setSaveErrorMessage(undefined)
    }

    return () => {
      abortCtrl.abort()
    }
  }, [show, loadFeeConfigValues])

  const validate = useCallback(
    (values: FeeFormValues) => {
      const errors = {} as FormikErrors<FeeValues>

      if (values.enableValidation === false) {
        // do not validate form to enable resetting the values
        // this can only be done in dev mode!
        return errors
      }

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

      const txFeeErrors = validateTxFee(values.tx_fees, t)
      if (txFeeErrors.value) {
        errors.tx_fees = txFeeErrors.value
      }

      if (
        values.max_cj_fee_abs === undefined ||
        !isValidNumber(values.max_cj_fee_abs.value) ||
        values.max_cj_fee_abs.value! < CJ_FEE_ABS_MIN ||
        values.max_cj_fee_abs.value! > CJ_FEE_ABS_MAX
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
    [t],
  )

  const submit = async (values: FeeFormValues) => {
    const updates = [
      {
        key: FEE_CONFIG_KEYS.tx_fees,
        value: String(values.tx_fees?.value ?? ''),
      },
      {
        key: FEE_CONFIG_KEYS.tx_fees_factor,
        value: String(values.tx_fees_factor ?? ''),
      },
      {
        key: FEE_CONFIG_KEYS.max_cj_fee_abs,
        value: String(values.max_cj_fee_abs?.value ?? ''),
      },
      {
        key: FEE_CONFIG_KEYS.max_cj_fee_rel,
        value: String(values.max_cj_fee_rel ?? ''),
      },
    ]

    setSaveErrorMessage(undefined)
    setIsSubmitting(true)
    try {
      await updateConfigValues({ updates })

      setIsSubmitting(false)
      onSuccess && onSuccess()
      onHide()
    } catch (err: any) {
      setIsSubmitting(false)
      setSaveErrorMessage((_) =>
        t('settings.fees.error_saving_fee_config_failed', {
          reason: err.message || t('global.errors.reason_unknown'),
        }),
      )
    }
  }

  const cancel = useCallback(() => {
    onCancel && onCancel()
    onHide()
  }, [onCancel, onHide])

  return (
    <rb.Modal
      className={styles.feeConfigModal}
      size="lg"
      show={show}
      onHide={cancel}
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
              {feeFormValues && (
                <FeeConfigForm
                  ref={formRef}
                  initialValues={feeFormValues}
                  validate={validate}
                  onSubmit={submit}
                  defaultActiveSectionKey={defaultActiveSectionKey}
                />
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

          {__dev_allowFeeValuesReset && (
            <rb.Button
              variant="outline-dark"
              className="position-relative"
              onClick={() => {
                formRef.current?.setFieldValue('max_cj_fee_abs', undefined, false)
                formRef.current?.setFieldValue('max_cj_fee_rel', undefined, false)
                formRef.current?.setFieldValue('tx_fees', undefined, false)
                formRef.current?.setFieldValue('tx_fees_factor', undefined, false)
                setTimeout(() => formRef.current?.validateForm(), 4)
              }}
              disabled={isLoading || isSubmitting}
            >
              Reset form values
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                dev
              </span>
            </rb.Button>
          )}
          <rb.Button
            variant="dark"
            type="submit"
            className="d-flex justify-content-center align-items-center"
            disabled={isLoading || isSubmitting}
            onClick={() => formRef.current?.submitForm()}
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
