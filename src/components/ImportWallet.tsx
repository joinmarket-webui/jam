import { useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Formik, FormikErrors } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as Api from '../libs/JmWalletApi'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { ConfigKey, useRefreshConfigValues, useUpdateConfigValues } from '../context/ServiceConfigContext'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import Accordion from './Accordion'
import WalletCreationForm, { CreateWalletFormValues } from './WalletCreationForm'
import MnemonicPhraseInput from './MnemonicPhraseInput'
import { WalletInfo, WalletInfoSummary } from './WalletCreationConfirmation'
import { isDevMode, isDebugFeatureEnabled } from '../constants/debugFeatures'
import { routes, Route } from '../constants/routes'
import { DUMMY_MNEMONIC_PHRASE, JM_WALLET_FILE_EXTENSION, walletDisplayName } from '../utils'

const GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

const GAPLIMIT_SUGGESTIONS = {
  barely: 21,
  moderate: 121,
  heavy: 221,
}

const GAPLIMIT_DEFAULT = 6
const SEGWIT_ACTIVATION_BLOCK = 481_824 // https://github.com/bitcoin/bitcoin/blob/v25.0/src/kernel/chainparams.cpp#L86

type ImportWalletDetailsFormValues = {
  mnemonicPhrase: MnemonicPhrase
  blockheight: number
  gaplimit: number
}

const initialImportWalletDetailsFormValues: ImportWalletDetailsFormValues = isDevMode()
  ? {
      mnemonicPhrase: new Array<string>(12).fill(''),
      blockheight: 0,
      gaplimit: GAPLIMIT_SUGGESTIONS.heavy,
    }
  : {
      mnemonicPhrase: new Array<string>(12).fill(''),
      blockheight: SEGWIT_ACTIVATION_BLOCK,
      gaplimit: GAPLIMIT_SUGGESTIONS.barely,
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
  const [__dev_showFillerButton] = useState(isDebugFeatureEnabled('importFillerMnemonicPhrase'))

  const validate = useCallback(
    (values: ImportWalletDetailsFormValues) => {
      const errors = {} as FormikErrors<ImportWalletDetailsFormValues>
      const isMnemonicPhraseValid = values.mnemonicPhrase.every((it) => it.length > 0)
      if (!isMnemonicPhraseValid) {
        errors.mnemonicPhrase = t<string>('import_wallet.import_details.feedback_invalid_menmonic_phrase')
      }

      if (values.blockheight < 0) {
        errors.blockheight = t('import_wallet.import_details.feedback_invalid_blockheight', {
          min: 0,
        })
      }
      if (values.gaplimit < 1) {
        errors.gaplimit = t('import_wallet.import_details.feedback_invalid_gaplimit', {
          min: 1,
        })
      }
      return errors
    },
    [t]
  )

  return (
    <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
      {({ handleSubmit, handleBlur, handleChange, setFieldValue, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
          <MnemonicPhraseInput
            mnemonicPhrase={values.mnemonicPhrase}
            onChange={(val) => setFieldValue('mnemonicPhrase', val, true)}
            isDisabled={(_) => isSubmitting}
          />
          {__dev_showFillerButton && (
            <rb.Button
              variant="outline-dark"
              className="w-100 mb-4"
              onClick={() => setFieldValue('mnemonicPhrase', DUMMY_MNEMONIC_PHRASE, true)}
              disabled={isSubmitting}
            >
              {t('import_wallet.import_details.__dev_fill_with_dummy_mnemonic_phrase')}
            </rb.Button>
          )}
          <Accordion title={t('import_wallet.import_details.import_options')}>
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
                  min="0"
                  step="1000"
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
                  min="1"
                  step="1"
                  required
                />
                <rb.Form.Control.Feedback type="invalid">{errors.gaplimit}</rb.Form.Control.Feedback>
              </rb.InputGroup>
            </rb.Form.Group>
          </Accordion>
          <rb.Button className="w-100 mb-4" variant="dark" size="lg" type="submit" disabled={isSubmitting}>
            <div className="d-flex justify-content-center align-items-center">
              {isSubmitting && (
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              )}
              {submitButtonText(isSubmitting)}
            </div>
          </rb.Button>
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
    [walletDetails, importDetails]
  )

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

          <rb.Form.Group controlId="blockheight" className="mb-4">
            <rb.Form.Label>{t('import_wallet.import_details.label_blockheight')}</rb.Form.Label>
            <rb.InputGroup hasValidation={false}>
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
                value={values.importDetails.blockheight}
                disabled={true}
              />
            </rb.InputGroup>
          </rb.Form.Group>
          <rb.Form.Group controlId="gaplimit" className="mb-4">
            <rb.Form.Label>{t('import_wallet.import_details.label_gaplimit')}</rb.Form.Label>
            <rb.InputGroup hasValidation={false}>
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
                value={values.importDetails.gaplimit}
                disabled={true}
              />
            </rb.InputGroup>
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

interface ImportWalletProps {
  parentRoute: Route
  startWallet: (name: Api.WalletName, token: Api.ApiToken) => void
}

export default function ImportWallet({ parentRoute, startWallet }: ImportWalletProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()
  const refreshConfigValues = useRefreshConfigValues()
  const updateConfigValues = useUpdateConfigValues()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [createWalletFormValues, setCreateWalletFormValues] = useState<CreateWalletFormValues>()
  const [importDetailsFormValues, setImportDetailsFormValues] = useState<ImportWalletDetailsFormValues>()
  const [recoveredWallet, setRecoveredWallet] = useState<{ walletFileName: Api.WalletName; token: Api.ApiToken }>()

  const isRecovered = useMemo(() => !!recoveredWallet?.walletFileName && recoveredWallet?.token, [recoveredWallet])
  const canRecover = useMemo(
    () => !isRecovered && !serviceInfo?.walletName && !serviceInfo?.rescanning,
    [isRecovered, serviceInfo]
  )

  const [step, setStep] = useState('input-wallet-details')
  const nextStep = () =>
    setStep((old) => {
      switch (step) {
        case 'input-wallet-details':
          return 'input-import-details'
        case 'input-import-details':
          return 'confirm-inputs-and-start-import'
        default:
          return old
      }
    })
  const previousStep = () =>
    setStep((old) => {
      switch (step) {
        case 'input-import-details':
          return 'input-wallet-details'
        case 'confirm-inputs-and-start-import':
          return 'input-import-details'
        default:
          return old
      }
    })

  const recoverWallet = useCallback(
    async (
      signal: AbortSignal,
      {
        walletname,
        password,
        seedphrase,
        gaplimit,
        blockheight,
      }: { walletname: Api.WalletName; password: string; seedphrase: string; gaplimit: number; blockheight: number }
    ) => {
      setAlert(undefined)

      try {
        // Step #1: recover wallet
        const recoverResponse = await Api.postWalletRecover({ signal }, { walletname, password, seedphrase })
        const recoverBody = await (recoverResponse.ok ? recoverResponse.json() : Api.Helper.throwError(recoverResponse))

        const { walletname: importedWalletFileName } = recoverBody
        setRecoveredWallet({ walletFileName: importedWalletFileName, token: recoverBody.token })

        // Step #2: update the gaplimit config value
        const originalGaplimit = await refreshConfigValues({
          signal,
          keys: [GAPLIMIT_CONFIGKEY],
          wallet: { name: importedWalletFileName, token: recoverBody.token },
        })
          .then((it) => it[GAPLIMIT_CONFIGKEY.section] || {})
          .then((it) => parseInt(it[GAPLIMIT_CONFIGKEY.field] || String(GAPLIMIT_DEFAULT), 10))
          .then((it) => it || GAPLIMIT_DEFAULT)

        console.info('Will update gaplimit from %d to %d', originalGaplimit, gaplimit)

        await updateConfigValues({
          signal,
          updates: [
            {
              key: GAPLIMIT_CONFIGKEY,
              value: String(gaplimit),
            },
          ],
          wallet: { name: importedWalletFileName, token: recoverBody.token },
        })

        // Step #3: lock and unlock the wallet (for new addresses to be imported)
        const lockResponse = await Api.getWalletLock({ walletName: importedWalletFileName, token: recoverBody.token })
        if (!lockResponse.ok) await Api.Helper.throwError(lockResponse)

        const unlockResponse = await Api.postWalletUnlock({ walletName: importedWalletFileName }, { password })
        const unlockBody = await (unlockResponse.ok ? unlockResponse.json() : Api.Helper.throwError(unlockResponse))

        // Step #4: reset `gaplimit´ to previous value
        console.info('Will reset gaplimit to previous value %d', originalGaplimit)
        await updateConfigValues({
          signal,
          updates: [
            {
              key: GAPLIMIT_CONFIGKEY,
              value: String(originalGaplimit),
            },
          ],
          wallet: { name: importedWalletFileName, token: unlockBody.token },
        })

        // Step #5: invoke rescanning the timechain
        console.info('Will start rescanning timechain from block %d', blockheight)

        const rescanResponse = await Api.getRescanBlockchain({
          signal,
          walletName: importedWalletFileName,
          token: unlockBody.token,
          blockheight,
        })
        if (!rescanResponse.ok) await Api.Helper.throwError(rescanResponse)

        startWallet(importedWalletFileName, unlockBody.token)
        navigate(routes.wallet)
      } catch (e: any) {
        if (signal.aborted) return
        const message = t('import_wallet.error_importing_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [setRecoveredWallet, startWallet, navigate, setAlert, refreshConfigValues, updateConfigValues, t]
  )

  return (
    <div className="import-wallet">
      <>
        {step === 'input-wallet-details' && <PageTitle title={t('import_wallet.wallet_details.title')} />}
        {step === 'input-import-details' && (
          <PageTitle
            title={t('import_wallet.import_details.title')}
            subtitle={t('import_wallet.import_details.subtitle')}
          />
        )}
        {step === 'confirm-inputs-and-start-import' && <PageTitle title={t('import_wallet.confirmation.title')} />}
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
              <Trans i18nKey="import_wallet.alert_rescanning_already_in_progress">
                Rescanning the timechain is currently in progress. Please wait till it finishes and then try again.
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
          {step === 'input-wallet-details' && (
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
                    : 'import_wallet.wallet_details.text_button_submit'
                )
              }
            />
          )}
          {step === 'input-import-details' && (
            <ImportWalletDetailsForm
              initialValues={importDetailsFormValues}
              submitButtonText={(isSubmitting) =>
                t(
                  isSubmitting
                    ? 'import_wallet.import_details.text_button_submitting'
                    : 'import_wallet.import_details.text_button_submit'
                )
              }
              onCancel={() => previousStep()}
              onSubmit={async (values) => {
                setImportDetailsFormValues(values)
                nextStep()
              }}
            />
          )}
          {step === 'confirm-inputs-and-start-import' && (
            <ImportWalletConfirmation
              walletDetails={createWalletFormValues!}
              importDetails={importDetailsFormValues!}
              submitButtonText={(isSubmitting) =>
                t(
                  isSubmitting
                    ? 'import_wallet.confirmation.text_button_submitting'
                    : 'import_wallet.confirmation.text_button_submit'
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
