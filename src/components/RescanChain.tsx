import { useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Formik, FormikErrors } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useServiceInfo } from '../context/ServiceInfoContext'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import { CurrentWallet } from '../context/WalletContext'
import { useUpdateConfigValues } from '../context/ServiceConfigContext'

const GAPLIMIT_CONFIGKEY = {
  section: 'YIELDGENERATOR',
  field: 'gaplimit',
}

type RescanChainFormValues = {
  blockheight: number
  gaplimit: number
}

const initialRescanChainFormValues: RescanChainFormValues = {
  blockheight: 0,
  gaplimit: 6,
}

interface RescanChainFormProps {
  onSubmit: (values: RescanChainFormValues) => Promise<void>
}

const RescanChainForm = ({ onSubmit }: RescanChainFormProps) => {
  const { t, i18n } = useTranslation()

  return (
    <Formik
      initialValues={initialRescanChainFormValues}
      validate={(values) => {
        const errors = {} as FormikErrors<RescanChainFormValues>
        if (values.blockheight < 0) {
          errors.blockheight = t('rescan_chain.feedback_invalid_blockheight', {
            min: 0,
          })
        }
        if (values.gaplimit < 0) {
          errors.gaplimit = t('rescan_chain.feedback_invalid_gaplimit', {
            min: 0,
          })
        }
        return errors
      }}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, handleBlur, handleChange, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
          <rb.Form.Group controlId="blockheight" className="mb-4">
            <rb.Form.Label>{t('rescan_chain.label_blockheight')}</rb.Form.Label>
            <rb.InputGroup hasValidation>
              <rb.InputGroup.Text id="blockheight-addon1">
                <Sprite symbol="block" width="24" height="24" name="Block" />
              </rb.InputGroup.Text>
              <rb.Form.Control
                aria-label={t('rescan_chain.label_blockheight')}
                className="slashed-zeroes"
                name="blockheight"
                type="number"
                placeholder="1"
                size="lg"
                value={values.blockheight}
                disabled={isSubmitting}
                onBlur={handleBlur}
                onChange={handleChange}
                isValid={touched.blockheight && !errors.blockheight}
                isInvalid={touched.blockheight && !!errors.blockheight}
                min="0"
                step="1"
              />
              <rb.Form.Control.Feedback type="invalid">{errors.blockheight}</rb.Form.Control.Feedback>
            </rb.InputGroup>
          </rb.Form.Group>
          <rb.Button className="w-100" variant="dark" size="lg" type="submit" disabled={isSubmitting}>
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
                  {t('rescan_chain.text_button_submitting')}
                </>
              ) : (
                <>{t('rescan_chain.text_button_submit')}</>
              )}
            </div>
          </rb.Button>
        </rb.Form>
      )}
    </Formik>
  )
}

interface RescanChainProps {
  wallet: CurrentWallet
}

export default function RescanChain({ wallet }: RescanChainProps) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const updateConfigValues = useUpdateConfigValues()

  const [alert, setAlert] = useState<SimpleAlert>()
  // const [isStartRescanning, setIsStartRescanning] = useState<boolean>(false)

  const startChainRescan = useCallback(
    async (signal: AbortSignal, { blockheight }: { blockheight: number }) => {
      setAlert(undefined)
      // setIsStartRescanning(true)

      try {
        const requestContext = { walletName: wallet.name, token: wallet.token }
        const res = await Api.getRescanBlockchain({ signal, ...requestContext, blockheight })
        if (!res.ok) await Api.Helper.throwError(res)
      } catch (e: any) {
        if (signal.aborted) return

        const message = t('import_wallet.error_rescanning_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      } finally {
        // setIsStartRescanning(false)
      }
    },
    [wallet, setAlert, t]
  )

  return (
    <div className="import-wallet">
      <PageTitle title={t('rescan_chain.title')} subtitle={t('rescan_chain.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <>
        <div className="mb-4">
          <Trans i18nKey="rescan_chain.description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </Trans>
        </div>
        <div className="mb-4">
          {serviceInfo?.rescanning ? (
            <>Rescan in progress...</>
          ) : (
            <RescanChainForm
              onSubmit={async (values) => {
                const abortCtrl = new AbortController()

                return updateConfigValues({
                  signal: abortCtrl.signal,
                  updates: [
                    {
                      key: GAPLIMIT_CONFIGKEY,
                      value: String(values.gaplimit),
                    },
                  ],
                })
                  .then((it) => {
                    /*
                     * TODO: verify that each jar has last address index > gaplimit
                     * or else generate as many addresses to reach index := gaplimit
                     */
                    return it
                  })
                  .then((it) =>
                    startChainRescan(abortCtrl.signal, {
                      blockheight: values.blockheight,
                    })
                  )
              }}
            />
          )}
        </div>
      </>
    </div>
  )
}
