import { useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { Formik, FormikErrors } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useServiceInfo, useDispatchServiceInfo } from '../context/ServiceInfoContext'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import { CurrentWallet } from '../context/WalletContext'
import { SEGWIT_ACTIVATION_BLOCK } from '../utils'

type RescanChainFormValues = {
  blockheight: number
}

const initialRescanChainFormValues: RescanChainFormValues = {
  blockheight: SEGWIT_ACTIVATION_BLOCK,
}

interface RescanChainFormProps {
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onSubmit: (values: RescanChainFormValues) => Promise<void>
  disabled?: boolean
}
/**
 * 
 * @param param0 
  "rescan_chain": {
    "error_rescanning_failed": "Error while starting the rescan process. Reason: {{ reason }}"
  },
 * @returns 
 */

const RescanChainForm = ({ disabled, submitButtonText, onSubmit }: RescanChainFormProps) => {
  const { t, i18n } = useTranslation()

  return (
    <div
      className={classNames({
        blurred: disabled,
      })}
    >
      <Formik
        initialValues={initialRescanChainFormValues}
        validate={(values) => {
          const errors = {} as FormikErrors<RescanChainFormValues>
          if (typeof values.blockheight !== 'number' || values.blockheight < 0) {
            errors.blockheight = t('rescan_chain.feedback_invalid_blockheight', {
              min: 0,
            })
          }
          return errors
        }}
        onSubmit={async (values) => !disabled && onSubmit(values)}
      >
        {({ handleSubmit, handleBlur, handleChange, values, touched, errors, isSubmitting }) => (
          <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
            <rb.Form.Group controlId="blockheight" className="mb-4">
              <rb.Form.Label>{t('rescan_chain.label_blockheight')}</rb.Form.Label>
              <rb.Form.Text className="d-block text-secondary mb-2">
                {t('rescan_chain.description_blockheight')}
              </rb.Form.Text>
              <rb.InputGroup hasValidation>
                <rb.InputGroup.Text id="blockheight-addon1">
                  <Sprite symbol="block" width="24" height="24" name="Block" />
                </rb.InputGroup.Text>
                <rb.Form.Control
                  aria-label={t('rescan_chain.label_blockheight')}
                  className="slashed-zeroes"
                  name="blockheight"
                  type="number"
                  placeholder="0"
                  size="lg"
                  value={values.blockheight}
                  disabled={isSubmitting || disabled}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  isValid={touched.blockheight && !errors.blockheight}
                  isInvalid={touched.blockheight && !!errors.blockheight}
                  min={0}
                  step={1_000}
                />
                <rb.Form.Control.Feedback type="invalid">{errors.blockheight}</rb.Form.Control.Feedback>
              </rb.InputGroup>
            </rb.Form.Group>
            <rb.Button className="w-100" variant="dark" size="lg" type="submit" disabled={isSubmitting || disabled}>
              <div className="d-flex justify-content-center align-items-center">
                {isSubmitting && (
                  <rb.Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                )}
                {submitButtonText(isSubmitting)}
              </div>
            </rb.Button>
          </rb.Form>
        )}
      </Formik>
    </div>
  )
}

interface RescanChainProps {
  wallet: CurrentWallet
}

export default function RescanChain({ wallet }: RescanChainProps) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const dispatchServiceInfo = useDispatchServiceInfo()

  const [alert, setAlert] = useState<SimpleAlert>()

  const startChainRescan = useCallback(
    async (signal: AbortSignal, { blockheight }: { blockheight: number }) => {
      setAlert(undefined)

      try {
        const res = await Api.getRescanBlockchain({ ...wallet, signal, blockheight })
        if (!res.ok) await Api.Helper.throwError(res)

        dispatchServiceInfo({
          rescanning: true,
        })
      } catch (e: any) {
        if (signal.aborted) return

        const message = t('rescan_chain.error_rescanning_failed', {
          reason: e.message || t('global.errors.reason_unknown'),
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [wallet, setAlert, dispatchServiceInfo, t],
  )

  return (
    <div className="import-wallet">
      <PageTitle title={t('rescan_chain.title')} subtitle={t('rescan_chain.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <div className="mb-4">
        {serviceInfo?.rescanning === true && <rb.Alert variant="success">{t('app.alert_rescan_in_progress')} ({serviceInfo?.rescanProgress ?? 0}%)</rb.Alert>}
        <RescanChainForm
          disabled={serviceInfo?.rescanning}
          submitButtonText={(isSubmitting) =>
            t(isSubmitting ? 'rescan_chain.text_button_submitting' : 'rescan_chain.text_button_submit')
          }
          onSubmit={async (values) => {
            const abortCtrl = new AbortController()

            return startChainRescan(abortCtrl.signal, {
              blockheight: values.blockheight,
            })
          }}
        />
      </div>
    </div>
  )
}
