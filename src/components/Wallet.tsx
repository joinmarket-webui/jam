import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Formik, FormikErrors } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { walletDisplayName } from '../utils'
import { TabActivityIndicator, JoiningIndicator } from './ActivityIndicators'
import Sprite from './Sprite'
import { routes } from '../constants/routes'
import styles from './Wallet.module.css'
import { WalletFileName } from '../libs/JmWalletApi'

interface WalletLockFormProps {
  walletFileName: WalletFileName
  lockWallet: (walletFileName: WalletFileName, options: { confirmed: boolean }) => Promise<void>
}

const WalletLockForm = ({ walletFileName, lockWallet }: WalletLockFormProps) => {
  const { t } = useTranslation()

  const onSubmit = useCallback(async () => {
    await lockWallet(walletFileName, { confirmed: false })
  }, [walletFileName, lockWallet])

  return (
    <Formik initialValues={{}} validate={() => ({})} onSubmit={onSubmit}>
      {({ handleSubmit, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate>
          <Link className="btn btn-dark me-2" to={routes.wallet}>
            {t('wallets.wallet_preview.button_open')}
          </Link>
          <rb.Button variant="outline-dark" type="submit" disabled={isSubmitting}>
            <div className="d-flex justify-content-center align-items-center">
              {isSubmitting ? (
                <>
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('wallets.wallet_preview.button_locking')}
                </>
              ) : (
                <>
                  <Sprite symbol="lock" width="24" height="24" className="me-1" />
                  {t('wallets.wallet_preview.button_lock')}
                </>
              )}
            </div>
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

interface WalletUnlockFormProps {
  walletFileName: WalletFileName
  unlockWallet: (walletFileName: WalletFileName, password: string) => Promise<void>
}

type WalletUnlockFormValues = {
  password: string
}

const walletUnlockFormInitialValues: WalletUnlockFormValues = {
  password: '',
}

const WalletUnlockForm = ({ walletFileName, unlockWallet }: WalletUnlockFormProps) => {
  const { t } = useTranslation()

  const validate = (values: WalletUnlockFormValues) => {
    const errors: FormikErrors<WalletUnlockFormValues> = {}
    if (!values.password) {
      errors.password = t('wallets.wallet_preview.feedback_missing_password')
    }
    return errors
  }

  const onSubmit = useCallback(
    async (values) => {
      const { password } = values
      await unlockWallet(walletFileName, password)
    },
    [walletFileName, unlockWallet],
  )

  return (
    <Formik
      initialValues={walletUnlockFormInitialValues}
      validate={validate}
      onSubmit={onSubmit}
      validateOnBlur={false}
    >
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
              isInvalid={!!touched.password && !!errors.password}
            />
            <rb.Button
              variant="outline-dark"
              className="d-flex justify-content-center align-items-center py-1 px-3"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {t('wallets.wallet_preview.button_unlocking')}
                </>
              ) : (
                <>
                  <Sprite symbol="unlock" width="24" height="24" className="me-1" />
                  {t('wallets.wallet_preview.button_unlock')}
                </>
              )}
            </rb.Button>
            <rb.Form.Control.Feedback type="invalid">{errors.password}</rb.Form.Control.Feedback>
          </rb.InputGroup>
        </rb.Form>
      )}
    </Formik>
  )
}

export interface WalletProps {
  walletFileName: WalletFileName
  lockWallet?: (walletFileName: WalletFileName, options: { confirmed: boolean }) => Promise<void>
  unlockWallet?: (walletFileName: WalletFileName, password: string) => Promise<void>
  isActive?: boolean
  makerRunning?: boolean
  coinjoinInProgress?: boolean
  [key: string]: any
}

export default function Wallet({
  walletFileName,
  lockWallet,
  unlockWallet,
  isActive,
  makerRunning,
  coinjoinInProgress,
  ...props
}: WalletProps) {
  const { t } = useTranslation()

  const displayName = useMemo(() => walletDisplayName(walletFileName), [walletFileName])

  return (
    <>
      <rb.Card {...props}>
        <rb.Card.Body>
          <div className="w-100 d-flex justify-content-between align-items-center flex-wrap py-1">
            <div>
              <rb.Card.Title>
                {isActive ? (
                  <span style={{ position: 'relative' }}>
                    {lockWallet ? (
                      <Link className="wallet-name" to={routes.wallet}>
                        {displayName}
                      </Link>
                    ) : (
                      <>{displayName}</>
                    )}
                    {makerRunning && <TabActivityIndicator isOn={true} />}
                    {coinjoinInProgress && <JoiningIndicator isOn={true} className="text-success" />}
                  </span>
                ) : (
                  <>{displayName}</>
                )}
              </rb.Card.Title>

              {isActive ? (
                <span className="text-success">{t('wallets.wallet_preview.wallet_active')}</span>
              ) : (
                <span className="text-muted">{t('wallets.wallet_preview.wallet_inactive')}</span>
              )}
            </div>

            {lockWallet ? (
              <WalletLockForm walletFileName={walletFileName} lockWallet={lockWallet} />
            ) : (
              <div className={`w-100 mt-3 mt-md-0 ${styles.walletPasswordInput}`}>
                {unlockWallet && <WalletUnlockForm walletFileName={walletFileName} unlockWallet={unlockWallet} />}
              </div>
            )}
          </div>
        </rb.Card.Body>
      </rb.Card>
    </>
  )
}
