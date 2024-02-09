import { useCallback, useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import Sprite from './Sprite'
import { JM_WALLET_FILE_EXTENSION, sanitizeWalletName } from '../utils'
import styles from './WalletCreationForm.module.css'
import * as Api from '../libs/JmWalletApi'

export interface CreateWalletFormValues {
  walletName: string
  password: string
  passwordConfirm: string
}

const initialCreateWalletFormValues: CreateWalletFormValues = {
  walletName: '',
  password: '',
  passwordConfirm: '',
}

export type WalletNameAndPassword = { name: string; password: string }

const MAX_WALLET_NAME_LENGTH = 240 - JM_WALLET_FILE_EXTENSION.length
const validateWalletName = (input: string) => input.length <= MAX_WALLET_NAME_LENGTH && /^[\w-]+$/.test(input)

interface WalletCreationFormProps {
  initialValues?: CreateWalletFormValues
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onCancel: () => void
  onSubmit: (values: CreateWalletFormValues) => Promise<void>
}

const WalletCreationForm = ({
  initialValues = initialCreateWalletFormValues,
  submitButtonText,
  onCancel,
  onSubmit,
}: WalletCreationFormProps) => {
  const [walletList, setWalletList] = useState<Api.WalletFileName[] | null>(null)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const abortCtrl = new AbortController()

    Api.getWalletAll({ signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('wallets.error_loading_failed'))))
      .then((data) => {
        if (abortCtrl.signal.aborted) return
        setWalletList(data.wallets)
      })
      .catch(() => {
        // do nothing on purpose
      })

    return () => abortCtrl.abort()
  }, [t])

  const validate = useCallback(
    (values: CreateWalletFormValues) => {
      const errors = {} as FormikErrors<CreateWalletFormValues>
      if (!values.walletName || !validateWalletName(values.walletName)) {
        errors.walletName = t('create_wallet.feedback_invalid_wallet_name')
      }
      if (walletList && walletList.includes(`${values.walletName}.jmdat`)) {
        errors.walletName = t('create_wallet.feedback_wallet_name_already_exists')
      }
      if (!values.password) {
        errors.password = t('create_wallet.feedback_invalid_password')
      }
      if (!values.passwordConfirm || values.password !== values.passwordConfirm) {
        errors.passwordConfirm = t('create_wallet.feedback_invalid_password_confirm')
      }
      return errors
    },
    [t, walletList],
  )

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={async (values) => {
        await onSubmit({ ...values, walletName: sanitizeWalletName(values.walletName) })
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
          <rb.Form.Group className="mb-4" controlId="walletName">
            <rb.Form.Label>{t('create_wallet.label_wallet_name')}</rb.Form.Label>
            <rb.Form.Control
              name="walletName"
              type="text"
              placeholder={t('create_wallet.placeholder_wallet_name')}
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.walletName}
              isValid={touched.walletName && !errors.walletName}
              isInvalid={touched.walletName && !!errors.walletName}
              className={styles.input}
              maxLength={MAX_WALLET_NAME_LENGTH}
            />
            <rb.Form.Control.Feedback>{t('create_wallet.feedback_valid')}</rb.Form.Control.Feedback>
            <rb.Form.Control.Feedback type="invalid">{errors.walletName}</rb.Form.Control.Feedback>
          </rb.Form.Group>
          <rb.Form.Group className="mb-4" controlId="password">
            <rb.Form.Label>{t('create_wallet.label_password')}</rb.Form.Label>
            <rb.Form.Control
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('create_wallet.placeholder_password')}
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.password}
              isValid={touched.password && !errors.password}
              isInvalid={touched.password && !!errors.password}
              className={styles.input}
            />
            <rb.Form.Control.Feedback>{t('create_wallet.feedback_valid')}</rb.Form.Control.Feedback>
            <rb.Form.Control.Feedback type="invalid">{errors.password}</rb.Form.Control.Feedback>
          </rb.Form.Group>
          <rb.Form.Group className="mb-4" controlId="passwordConfirm">
            <rb.Form.Label>{t('create_wallet.label_password_confirm')}</rb.Form.Label>
            <rb.Form.Control
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              placeholder={t('create_wallet.placeholder_password_confirm')}
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.passwordConfirm}
              isValid={touched.passwordConfirm && !errors.passwordConfirm}
              isInvalid={touched.passwordConfirm && !!errors.passwordConfirm}
              className={styles.input}
            />
            <rb.Form.Control.Feedback>{t('create_wallet.feedback_valid')}</rb.Form.Control.Feedback>
            <rb.Form.Control.Feedback type="invalid">{errors.passwordConfirm}</rb.Form.Control.Feedback>
          </rb.Form.Group>
          <rb.Button className="w-100 mb-4" variant="dark" size="lg" type="submit" disabled={isSubmitting}>
            <div className="d-flex justify-content-center align-items-center">
              {isSubmitting && (
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              )}
              {submitButtonText(isSubmitting)}
            </div>
          </rb.Button>
          {isSubmitting && (
            <div className="text-center text-muted small mb-4">
              <p>{t('create_wallet.hint_duration_text')}</p>
            </div>
          )}
          <rb.Button
            className="w-100 mb-4"
            variant="none"
            hidden={isSubmitting}
            disabled={isSubmitting}
            onClick={() => onCancel()}
          >
            <div className="d-flex justify-content-center align-items-center">
              <Sprite symbol="cross" width="20" height="20" className="me-2" />
              {t('global.cancel')}
            </div>
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

export default WalletCreationForm
