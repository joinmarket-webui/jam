import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Formik } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import { TabActivityIndicator, JoiningIndicator } from './ActivityIndicators'
import { routes } from '../constants/routes'
import styles from './Wallet.module.css'

const WalletLockForm = ({ walletName, lockWallet }) => {
  const { t } = useTranslation()

  const onSubmit = useCallback(async () => {
    await lockWallet(walletName, { confirmed: false })
  }, [walletName, lockWallet])

  return (
    <Formik initialValues={{}} validate={() => ({})} onSubmit={onSubmit}>
      {({ handleSubmit, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <Link className="btn btn-outline-dark me-2" to={routes.wallet}>
            {t('wallets.wallet_preview.button_open')}
          </Link>
          <rb.Button variant="outline-dark" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="d-flex justify-content-center align-items-center">
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('wallets.wallet_preview.button_locking')}
              </div>
            ) : (
              t('wallets.wallet_preview.button_lock')
            )}
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

const WalletUnlockForm = ({ walletName, unlockWallet }) => {
  const { t } = useTranslation()

  const initialValues = {
    password: '',
  }
  const validate = (values) => {
    const errors = {}
    if (!values.password) {
      errors.password = t('wallets.wallet_preview.feedback_missing_password')
    }
    return errors
  }

  const onSubmit = useCallback(
    async (values) => {
      const { password } = values
      await unlockWallet(walletName, password)
    },
    [walletName, unlockWallet]
  )

  return (
    <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit} validateOnBlur={false}>
      {({ handleSubmit, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <rb.InputGroup hasValidation={true}>
            <rb.Form.Control
              name="password"
              type="password"
              placeholder={t('wallets.wallet_preview.placeholder_password')}
              disabled={isSubmitting}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.password}
              isInvalid={touched.password && errors.password}
            />
            <rb.Button variant="outline-dark" className="py-1 px-3" type="submit" disabled={isSubmitting}>
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
                  {t('wallets.wallet_preview.button_unlocking')}
                </div>
              ) : (
                t('wallets.wallet_preview.button_unlock')
              )}
            </rb.Button>
            <rb.Form.Control.Feedback type="invalid">{errors.password}</rb.Form.Control.Feedback>
          </rb.InputGroup>
        </rb.Form>
      )}
    </Formik>
  )
}

export default function Wallet({
  name,
  noneActive,
  isActive,
  hasToken,
  makerRunning,
  coinjoinInProgress,
  currentWallet,
  lockWallet,
  unlockWallet,
  ...props
}) {
  const { t } = useTranslation()

  const showLockOptions = isActive && hasToken
  const showUnlockOptions = noneActive || (isActive && !hasToken) || (!hasToken && !makerRunning && !coinjoinInProgress)

  return (
    <>
      <rb.Card {...props}>
        <rb.Card.Body>
          <div className="w-100 d-flex justify-content-between align-items-center flex-wrap py-1">
            <div>
              <rb.Card.Title>
                {isActive ? (
                  <span style={{ position: 'relative' }}>
                    <Link className="wallet-name" to={routes.wallet}>
                      {walletDisplayName(name)}
                    </Link>
                    {makerRunning && <TabActivityIndicator isOn={true} />}
                    {coinjoinInProgress && <JoiningIndicator isOn={true} className="text-success" />}
                  </span>
                ) : (
                  <>{walletDisplayName(name)}</>
                )}
              </rb.Card.Title>

              {isActive ? (
                <span className="text-success">{t('wallets.wallet_preview.wallet_active')}</span>
              ) : (
                <span className="text-muted">{t('wallets.wallet_preview.wallet_inactive')}</span>
              )}
            </div>

            {showLockOptions ? (
              <WalletLockForm walletName={name} lockWallet={lockWallet} />
            ) : (
              <div className={`w-100 mt-3 mt-md-0 ${styles['wallet-password-input']}`}>
                {showUnlockOptions && <WalletUnlockForm walletName={name} unlockWallet={unlockWallet} />}
              </div>
            )}
          </div>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}
