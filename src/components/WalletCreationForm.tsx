import { useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import styles from './WalletCreationForm.module.css'

export interface FormValues {
  walletName: string
  password: string
  passwordConfirm: string
}

const initialValues: FormValues = {
  walletName: '',
  password: '',
  passwordConfirm: '',
}

interface WalletCreationFormProps {
  onSubmit: (name: string, password: string) => Promise<void>
}

const WalletCreationForm = ({ onSubmit }: WalletCreationFormProps) => {
  const { t } = useTranslation()

  const validate = useCallback(
    (values: FormValues) => {
      const errors = {} as FormikErrors<FormValues>
      if (!values.walletName) {
        errors.walletName = t('create_wallet.feedback_invalid_wallet_name')
      }
      if (!values.password) {
        errors.password = t('create_wallet.feedback_invalid_password')
      }
      if (!values.passwordConfirm || values.password !== values.passwordConfirm) {
        errors.passwordConfirm = t('create_wallet.feedback_invalid_password_confirm')
      }
      return errors
    },
    [t]
  )

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={async (values: FormValues) => {
        const { walletName, password } = values
        await onSubmit(walletName, password)
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
        <>
          {isSubmitting && <PreventLeavingPageByMistake />}
          <rb.Form onSubmit={handleSubmit} noValidate>
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
            <rb.Button variant="dark" className={styles.button} type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="d-flex justify-content-center align-items-center">
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('create_wallet.button_creating')}
                </div>
              ) : (
                t('create_wallet.button_create')
              )}
            </rb.Button>
          </rb.Form>
          {isSubmitting && (
            <div className="text-center text-muted small mt-4">
              <p>{t('create_wallet.hint_duration_text')}</p>
            </div>
          )}
        </>
      )}
    </Formik>
  )
}

export default WalletCreationForm
