import { useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Formik, FormikErrors } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import * as Api from '../libs/JmWalletApi'
import { useServiceInfo, useDispatchServiceInfo } from '../context/ServiceInfoContext'
import { useRefreshConfigValues, useUpdateConfigValues } from '../context/ServiceConfigContext'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import Accordion from './Accordion'
import WalletCreationForm, { CreateWalletFormValues } from './WalletCreationForm'
import MnemonicPhraseInput from './MnemonicPhraseInput'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import { WalletInfo, WalletInfoSummary } from './WalletCreationConfirmation'
import { isDevMode, isDebugFeatureEnabled } from '../constants/debugFeatures'
import { routes, Route } from '../constants/routes'
import {
  SEGWIT_ACTIVATION_BLOCK,
  DUMMY_MNEMONIC_PHRASE,
  JM_WALLET_FILE_EXTENSION,
  walletDisplayName,
  isValidNumber,
} from '../utils'
import { JM_GAPLIMIT_DEFAULT, JM_GAPLIMIT_CONFIGKEY } from '../constants/config'

type ImportWalletDetailsFormValues = {
  mnemonicPhrase: MnemonicPhrase
  blockheight: number
  gaplimit: number
}

const GAPLIMIT_SUGGESTIONS = {
  normal: JM_GAPLIMIT_DEFAULT,
  heavy: JM_GAPLIMIT_DEFAULT * 4,
}

const MIN_BLOCKHEIGHT_VALUE = 0
/**
 * Maximum blockheight value.
 * Value choosen based on estimation of blockheight in tge year 2140 (plus some buffer):
 * 365 × 144 × (2140 - 2009) = 6_885_360 = ~7_000_000
 * This is necessary because javascript does not handle large values too well,
 * and the `/rescanblockchain` errors. Not to mention that a value beyond the current
 * height does not make any sense in the first place.
 */
const MAX_BLOCKHEIGHT_VALUE = 10_000_000

const MIN_GAPLIMIT_VALUE = 1
/**
 * Maximum gaplimit value for importing an existing wallet.
 * This value represents an upper limit based on declining performance of JM when many
 * addresses have to be monitored. On network `regtest`, importing 10_000 addresses in
 * an empty wallet takes ~10min and requesting the `/display` endpoint takes another
 * ~10min. At this point, JM becomes practically unusable. However, goal is to find a
 * balance between usability and freedom of users to do what they are trying to do.
 */
const MAX_GAPLIMIT_VALUE = 10_000
/**
 * A gaplimit threshold at which a warning is displayed that with the given value a
 * decline in performance is to be expected. Importing 500 addresses (per jar!) leads to
 * the `/display` endpoint taking more than ~15s.
 */
const GAPLIMIT_WARN_THRESHOLD = 250

const initialImportWalletDetailsFormValues: ImportWalletDetailsFormValues = isDevMode()
  ? {
      mnemonicPhrase: new Array<string>(12).fill(''),
      blockheight: MIN_BLOCKHEIGHT_VALUE,
      gaplimit: GAPLIMIT_SUGGESTIONS.heavy,
    }
  : {
      mnemonicPhrase: new Array<string>(12).fill(''),
      blockheight: SEGWIT_ACTIVATION_BLOCK,
      gaplimit: GAPLIMIT_SUGGESTIONS.normal,
    }

interface ImportWalletDetailsFormProps {
  initialValues?: ImportWalletDetailsFormValues
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onCancel: () => void
  onSubmit: (values: ImportWalletDetailsFormValues) => Promise<void>
}

const ImportWalletDetailsForm = ({
  initialValues = initialImportWalletDetailsFormValues,
  submitButtonText,
  onCancel,
  onSubmit,
}: ImportWalletDetailsFormProps) => {
  const { t, i18n } = useTranslation()
  const [__dev_showFillerButton] = useState(isDebugFeatureEnabled('importDummyMnemonicPhrase'))

  const validate = useCallback(
    (values: ImportWalletDetailsFormValues) => {
      const errors = {} as FormikErrors<ImportWalletDetailsFormValues>
      const isMnemonicPhraseValid = values.mnemonicPhrase.every((it) => it.length > 0)
      if (!isMnemonicPhraseValid) {
        errors.mnemonicPhrase = t<string>('import_wallet.import_details.feedback_invalid_menmonic_phrase')
      }

      if (
        !isValidNumber(values.blockheight) ||
        values.blockheight < MIN_BLOCKHEIGHT_VALUE ||
        values.blockheight > MAX_BLOCKHEIGHT_VALUE
      ) {
        errors.blockheight = t('import_wallet.import_details.feedback_invalid_blockheight', {
          min: MIN_BLOCKHEIGHT_VALUE.toLocaleString(),
        })
      }
      if (
        !isValidNumber(values.gaplimit) ||
        values.gaplimit < MIN_GAPLIMIT_VALUE ||
        values.gaplimit > MAX_GAPLIMIT_VALUE
      ) {
        errors.gaplimit = t('import_wallet.import_details.feedback_invalid_gaplimit', {
          min: MIN_GAPLIMIT_VALUE.toLocaleString(),
          max: MAX_GAPLIMIT_VALUE.toLocaleString(),
        })
      }
      return errors
    },
    [t],
  )

  return (
    <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
      {({
        handleSubmit,
        handleBlur,
        handleChange,
        setFieldValue,
        values,
        touched,
        errors,
        isSubmitting,
        submitCount,
      }) => {
        const hasImportDetailsSectionErrors = !!errors.blockheight || !!errors.gaplimit
        const showGaplimitWarning = !errors.gaplimit && values.gaplimit > GAPLIMIT_WARN_THRESHOLD
        return (
          <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
            <MnemonicPhraseInput
              mnemonicPhrase={values.mnemonicPhrase}
              onChange={(val) => setFieldValue('mnemonicPhrase', val, true)}
              isDisabled={(_) => isSubmitting}
            />
            {!!errors.mnemonicPhrase && (
              <>
                <div
                  className={classNames('mb-2', 'text-danger', {
                    'd-none': submitCount === 0,
                  })}
                >
                  {errors.mnemonicPhrase}
                </div>
              </>
            )}
            {__dev_showFillerButton && (
              <rb.Button
                variant="outline-dark"
                className="w-100 mb-4 position-relative"
                onClick={() => setFieldValue('mnemonicPhrase', DUMMY_MNEMONIC_PHRASE, true)}
                disabled={isSubmitting}
              >
                Fill with dummy mnemonic phrase
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                  dev
                </span>
              </rb.Button>
            )}
            <Accordion
              title={t('import_wallet.import_details.import_options')}
              variant={hasImportDetailsSectionErrors ? 'danger' : showGaplimitWarning ? 'warning' : undefined}
              defaultOpen={true}
            >
              <rb.Form.Group controlId="blockheight" className="mb-4">
                <rb.Form.Label>{t('import_wallet.import_details.label_blockheight')}</rb.Form.Label>
                <rb.Form.Text className="d-block text-secondary mb-2">
                  {t('import_wallet.import_details.description_blockheight')}
                </rb.Form.Text>
                <rb.InputGroup hasValidation>
                  <rb.InputGroup.Text id="blockheight-addon1">
                    <Sprite symbol="block" width="24" height="24" name="Block" />
                  </rb.InputGroup.Text>
                  <rb.Form.Control
                    aria-label={t('import_wallet.import_details.label_blockheight')}
                    className="slashed-zeroes"
                    name="blockheight"
                    type="number"
                    placeholder="0"
                    size="lg"
                    value={values.blockheight}
                    disabled={isSubmitting}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    isValid={touched.blockheight && !errors.blockheight}
                    isInvalid={touched.blockheight && !!errors.blockheight}
                    min={MIN_BLOCKHEIGHT_VALUE}
                    max={MAX_BLOCKHEIGHT_VALUE}
                    step={1_000}
                    required
                  />
                  <rb.Form.Control.Feedback type="invalid">{errors.blockheight}</rb.Form.Control.Feedback>
                </rb.InputGroup>
              </rb.Form.Group>
              <rb.Form.Group controlId="gaplimit" className="mb-4">
                <rb.Form.Label>{t('import_wallet.import_details.label_gaplimit')}</rb.Form.Label>

                <rb.Form.Text className="d-block text-secondary mb-2">
                  {t('import_wallet.import_details.description_gaplimit')}
                </rb.Form.Text>
                <rb.InputGroup hasValidation>
                  <rb.InputGroup.Text id="gaplimit-addon1">
                    <Sprite symbol="gaplimit" width="24" height="24" name="Gaplimit" />
                  </rb.InputGroup.Text>
                  <rb.Form.Control
                    aria-label={t('import_wallet.import_details.label_gaplimit')}
                    className="slashed-zeroes"
                    name="gaplimit"
                    type="number"
                    placeholder="1"
                    size="lg"
                    value={values.gaplimit}
                    disabled={isSubmitting}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    isValid={touched.gaplimit && !errors.gaplimit}
                    isInvalid={touched.gaplimit && !!errors.gaplimit}
                    min={MIN_GAPLIMIT_VALUE}
                    max={MAX_GAPLIMIT_VALUE}
                    step={1}
                    required
                  />
                  <rb.Form.Control.Feedback type="invalid">{errors.gaplimit}</rb.Form.Control.Feedback>
                </rb.InputGroup>
                {showGaplimitWarning && (
                  <rb.Alert variant="warning" className="d-flex align-items-center mt-2">
                    {t('import_wallet.import_details.alert_high_gaplimit_value')}
                  </rb.Alert>
                )}
              </rb.Form.Group>
            </Accordion>
            <rb.Button className="w-100 mb-4" variant="dark" size="lg" type="submit" disabled={isSubmitting}>
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
            <div className="d-flex mb-4 gap-4">
              <rb.Button variant="none" hidden={isSubmitting} disabled={isSubmitting} onClick={() => onCancel()}>
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="arrow-left" width="20" height="20" className="me-2" />
                  {t('global.back')}
                </div>
              </rb.Button>
            </div>
          </rb.Form>
        )
      }}
    </Formik>
  )
}

type ImportWalletConfirmationFormValues = {
  walletDetails: CreateWalletFormValues
  importDetails: ImportWalletDetailsFormValues
}

interface ImportWalletConfirmationProps {
  walletDetails: CreateWalletFormValues
  importDetails: ImportWalletDetailsFormValues
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onCancel: () => void
  onSubmit: (values: ImportWalletConfirmationFormValues) => Promise<void>
}

const ImportWalletConfirmation = ({
  walletDetails,
  importDetails,
  submitButtonText,
  onCancel,
  onSubmit,
}: ImportWalletConfirmationProps) => {
  const { t, i18n } = useTranslation()

  const walletInfo = useMemo<WalletInfo>(
    () => ({
      walletFileName: walletDetails.walletName + JM_WALLET_FILE_EXTENSION,
      password: walletDetails.password,
      seedphrase: importDetails.mnemonicPhrase.join(' '),
    }),
    [walletDetails, importDetails],
  )

  const showGaplimitWarning = useMemo(() => importDetails.gaplimit > GAPLIMIT_WARN_THRESHOLD, [importDetails])

  return (
    <Formik
      initialValues={{
        walletDetails,
        importDetails,
      }}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, values, isSubmitting, submitCount }) => (
        <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
          <WalletInfoSummary walletInfo={walletInfo} revealSensitiveInfo={!isSubmitting && submitCount === 0} />

          <Accordion
            title={t('import_wallet.import_details.import_options')}
            variant={showGaplimitWarning ? 'warning' : undefined}
          >
            <div className="mb-4">
              <div>{t('import_wallet.import_details.label_blockheight')}</div>
              <div className="text-secondary small">{t('import_wallet.import_details.description_blockheight')}</div>
              <div className="fs-4">{values.importDetails.blockheight}</div>
            </div>
            <div className="mb-4">
              <div>{t('import_wallet.import_details.label_gaplimit')}</div>
              <div className="text-secondary small">{t('import_wallet.import_details.description_gaplimit')}</div>
              <div className="fs-4">{values.importDetails.gaplimit}</div>

              {showGaplimitWarning && (
                <rb.Alert variant="warning" className="d-flex align-items-center mt-2">
                  {t('import_wallet.import_details.alert_high_gaplimit_value')}
                </rb.Alert>
              )}
            </div>
          </Accordion>

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

          <div className="d-flex mb-4 gap-4">
            <rb.Button variant="none" hidden={isSubmitting} disabled={isSubmitting} onClick={() => onCancel()}>
              <Sprite symbol="arrow-left" width="20" height="20" className="me-2" />
              {t('global.back')}
            </rb.Button>
          </div>
        </rb.Form>
      )}
    </Formik>
  )
}

enum ImportWalletSteps {
  wallet_details,
  import_details,
  confirm_and_submit,
}

interface ImportWalletProps {
  parentRoute: Route
  startWallet: (name: Api.WalletName, auth: Api.ApiAuthContext) => void
}

export default function ImportWallet({ parentRoute, startWallet }: ImportWalletProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()
  const dispatchServiceInfo = useDispatchServiceInfo()
  const refreshConfigValues = useRefreshConfigValues()
  const updateConfigValues = useUpdateConfigValues()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [createWalletFormValues, setCreateWalletFormValues] = useState<CreateWalletFormValues>()
  const [importDetailsFormValues, setImportDetailsFormValues] = useState<ImportWalletDetailsFormValues>()
  const [recoveredWallet, setRecoveredWallet] = useState<{ walletFileName: Api.WalletName; auth: Api.ApiAuthContext }>()

  const isRecovered = useMemo(() => !!recoveredWallet?.walletFileName && recoveredWallet?.auth, [recoveredWallet])
  const canRecover = useMemo(
    () => !isRecovered && !serviceInfo?.walletName && !serviceInfo?.rescanning,
    [isRecovered, serviceInfo],
  )

  const [step, setStep] = useState<ImportWalletSteps>(ImportWalletSteps.wallet_details)
  const nextStep = () =>
    setStep((old) => {
      switch (step) {
        case ImportWalletSteps.wallet_details:
          return ImportWalletSteps.import_details
        case ImportWalletSteps.import_details:
          return ImportWalletSteps.confirm_and_submit
        default:
          return old
      }
    })
  const previousStep = () => {
    setAlert(undefined)
    setStep((old) => {
      switch (step) {
        case ImportWalletSteps.import_details:
          return ImportWalletSteps.wallet_details
        case ImportWalletSteps.confirm_and_submit:
          return ImportWalletSteps.import_details
        default:
          return old
      }
    })
  }

  const recoverWallet = useCallback(
    async (
      signal: AbortSignal,
      {
        walletname,
        password,
        seedphrase,
        gaplimit,
        blockheight,
      }: { walletname: Api.WalletName; password: string; seedphrase: string; gaplimit: number; blockheight: number },
    ) => {
      setAlert(undefined)

      try {
        // Step #1: recover wallet
        const recoverResponse = await Api.postWalletRecover({ signal }, { walletname, password, seedphrase })
        const recoverBody = await (recoverResponse.ok ? recoverResponse.json() : Api.Helper.throwError(recoverResponse))

        const { walletname: importedWalletFileName } = recoverBody
        let auth: Api.ApiAuthContext = Api.Helper.parseAuthProps(recoverBody)
        setRecoveredWallet({ walletFileName: importedWalletFileName, auth })

        // Step #2: update the gaplimit config value if necessary
        const originalGaplimit = await refreshConfigValues({
          signal,
          keys: [JM_GAPLIMIT_CONFIGKEY],
          wallet: { name: importedWalletFileName, token: auth.token },
        })
          .then((it) => it[JM_GAPLIMIT_CONFIGKEY.section] || {})
          .then((it) => parseInt(it[JM_GAPLIMIT_CONFIGKEY.field] || String(JM_GAPLIMIT_DEFAULT), 10))
          .then((it) => it || JM_GAPLIMIT_DEFAULT)

        const gaplimitUpdateNecessary = gaplimit !== originalGaplimit
        if (gaplimitUpdateNecessary) {
          console.info('Will update gaplimit from %d to %d', originalGaplimit, gaplimit)

          await updateConfigValues({
            signal,
            updates: [
              {
                key: JM_GAPLIMIT_CONFIGKEY,
                value: String(gaplimit),
              },
            ],
            wallet: { name: importedWalletFileName, token: auth.token },
          })
        }

        // Step #3: lock and unlock the wallet (for new addresses to be imported)
        const lockResponse = await Api.getWalletLock({ walletName: importedWalletFileName, token: auth.token })
        if (!lockResponse.ok) await Api.Helper.throwError(lockResponse)

        const unlockResponse = await Api.postWalletUnlock({ walletName: importedWalletFileName }, { password })
        const unlockBody = await (unlockResponse.ok ? unlockResponse.json() : Api.Helper.throwError(unlockResponse))
        auth = Api.Helper.parseAuthProps(unlockBody)

        // Step #4: reset `gaplimit´ to previous value if necessary
        if (gaplimitUpdateNecessary) {
          console.info('Will reset gaplimit to previous value %d', originalGaplimit)
          await updateConfigValues({
            signal,
            updates: [
              {
                key: JM_GAPLIMIT_CONFIGKEY,
                value: String(originalGaplimit),
              },
            ],
            wallet: { name: importedWalletFileName, token: auth.token },
          })
        }

        // Step #5: invoke rescanning the timechain
        console.info('Will start rescanning timechain from block %d', blockheight)

        const rescanResponse = await Api.getRescanBlockchain({
          signal,
          walletName: importedWalletFileName,
          token: unlockBody.token,
          blockheight,
        })
        if (!rescanResponse.ok) {
          await Api.Helper.throwError(rescanResponse)
        } else {
          dispatchServiceInfo({
            rescanning: true,
          })
        }

        startWallet(importedWalletFileName, auth)
        navigate(routes.wallet)
      } catch (e: any) {
        if (signal.aborted) return
        const message = t('import_wallet.error_importing_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [
      setRecoveredWallet,
      startWallet,
      navigate,
      setAlert,
      refreshConfigValues,
      updateConfigValues,
      dispatchServiceInfo,
      t,
    ],
  )

  return (
    <div className="import-wallet">
      <>
        {step === ImportWalletSteps.wallet_details && <PageTitle title={t('import_wallet.wallet_details.title')} />}
        {step === ImportWalletSteps.import_details && (
          <PageTitle
            title={t('import_wallet.import_details.title')}
            subtitle={t('import_wallet.import_details.subtitle')}
          />
        )}
        {step === ImportWalletSteps.confirm_and_submit && <PageTitle title={t('import_wallet.confirmation.title')} />}
      </>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {!canRecover && !isRecovered ? (
        <>
          {serviceInfo?.walletName && (
            <rb.Alert variant="warning">
              <Trans i18nKey="import_wallet.alert_other_wallet_unlocked">
                Currently <strong>{{ walletName: walletDisplayName(serviceInfo.walletName) }}</strong> is active. You
                need to lock it first.
                <Link to={routes.walletList} className="alert-link">
                  Go back
                </Link>
                .
              </Trans>
            </rb.Alert>
          )}
          {serviceInfo?.rescanning === true && (
            <rb.Alert variant="warning">
              <Trans i18nKey="import_wallet.alert_rescan_in_progress">
                Rescanning the timechain is currently in progress. Please wait until the process finishes and then try
                again.
                <Link to={routes.walletList} className="alert-link">
                  Go back
                </Link>
                .
              </Trans>
            </rb.Alert>
          )}
        </>
      ) : (
        <>
          <PreventLeavingPageByMistake />
          {step === ImportWalletSteps.wallet_details && (
            <WalletCreationForm
              initialValues={createWalletFormValues}
              onCancel={() => navigate(routes[parentRoute])}
              onSubmit={async (values) => {
                setCreateWalletFormValues(values)
                nextStep()
              }}
              submitButtonText={(isSubmitting) =>
                t(
                  isSubmitting
                    ? 'import_wallet.wallet_details.text_button_submitting'
                    : 'import_wallet.wallet_details.text_button_submit',
                )
              }
            />
          )}
          {step === ImportWalletSteps.import_details && (
            <ImportWalletDetailsForm
              initialValues={importDetailsFormValues}
              submitButtonText={(isSubmitting) =>
                t(
                  isSubmitting
                    ? 'import_wallet.import_details.text_button_submitting'
                    : 'import_wallet.import_details.text_button_submit',
                )
              }
              onCancel={() => previousStep()}
              onSubmit={async (values) => {
                setImportDetailsFormValues(values)
                nextStep()
              }}
            />
          )}
          {step === ImportWalletSteps.confirm_and_submit && (
            <ImportWalletConfirmation
              walletDetails={createWalletFormValues!}
              importDetails={importDetailsFormValues!}
              submitButtonText={(isSubmitting) =>
                t(
                  isSubmitting
                    ? 'import_wallet.confirmation.text_button_submitting'
                    : 'import_wallet.confirmation.text_button_submit',
                )
              }
              onCancel={() => previousStep()}
              onSubmit={(values) => {
                const abortCtrl = new AbortController()

                return recoverWallet(abortCtrl.signal, {
                  walletname: (values.walletDetails.walletName + JM_WALLET_FILE_EXTENSION) as Api.WalletName,
                  password: values.walletDetails.password,
                  seedphrase: values.importDetails.mnemonicPhrase.join(' '),
                  gaplimit: values.importDetails.gaplimit,
                  blockheight: values.importDetails.blockheight,
                })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
