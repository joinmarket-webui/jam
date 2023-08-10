import { useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Formik, FormikErrors } from 'formik'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import * as Api from '../libs/JmWalletApi'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { ConfigKey, useUpdateConfigValues } from '../context/ServiceConfigContext'
import PageTitle from './PageTitle'
import Sprite from './Sprite'
import WalletCreationForm from './WalletCreationForm'
import MnemonicWordInput from './MnemonicWordInput'
import { WalletInfo, WalletInfoSummary } from './WalletCreationConfirmation'
import { isDevMode, isDebugFeatureEnabled } from '../constants/debugFeatures'
import { routes } from '../constants/routes'
import { DUMMY_MNEMONIC_PHRASE, JM_WALLET_FILE_EXTENSION, walletDisplayName } from '../utils'
import styles from './ImportWallet.module.css'

const GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

const MnemonicPhraseInputForm = ({ onSubmit }: { onSubmit: (mnemonicPhrase: string) => void }) => {
  const { t } = useTranslation()
  const [mnemonicPhraseWords, setMnemonicPhraseWords] = useState(new Array<string>(12).fill(''))
  const [showFillerButton] = useState(isDebugFeatureEnabled('importFillerMnemonicPhrase'))

  const isMnemonicPhraseValid = useMemo(() => mnemonicPhraseWords.every((it) => it.length > 0), [mnemonicPhraseWords])
  return (
    <div>
      <rb.Form noValidate className="mb-4">
        <div className="container slashed-zeroes p-0">
          {mnemonicPhraseWords.map((_, outerIndex) => {
            if (outerIndex % 2 !== 0) return null

            const seedWords = mnemonicPhraseWords.slice(outerIndex, outerIndex + 2)

            return (
              <div className="row mb-4" key={outerIndex}>
                {seedWords.map((givenWord, innerIndex) => {
                  const wordIndex = outerIndex + innerIndex
                  return (
                    <div className="col" key={wordIndex}>
                      <MnemonicWordInput
                        index={wordIndex}
                        value={givenWord}
                        setValue={(value) =>
                          setMnemonicPhraseWords((words) =>
                            words.map((old, index) => (index === wordIndex ? value : old))
                          )
                        }
                        isValid={undefined}
                        disabled={false}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        {showFillerButton && (
          <rb.Button
            variant="outline-dark"
            className={styles.button}
            onClick={() => setMnemonicPhraseWords(DUMMY_MNEMONIC_PHRASE.split(' '))}
            disabled={false}
          >
            {t('import_wallet.mnemonic_phrase.__dev_fill_with_dummy_mnemonic_phrase')}
          </rb.Button>
        )}
      </rb.Form>

      <rb.Button
        variant="dark"
        className={styles.button}
        onClick={() => {
          if (isMnemonicPhraseValid) {
            onSubmit(mnemonicPhraseWords.join(' '))
          }
        }}
        disabled={!isMnemonicPhraseValid}
      >
        {t('import_wallet.mnemonic_phrase.text_button_submit')}
      </rb.Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        {/*<rb.Button
          variant="outline-dark"
          disabled={false}
          className={styles.button}
          onClick={() => {
            // parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </rb.Button>*/}
      </div>
    </div>
  )
}

type ImportWalletDetailsFormValues = {
  blockheight: number
  gaplimit: number
}

const GAPLIMIT_SUGGESTIONS = {
  default: 21,
  moderate: 121,
  heavy: 221,
}

const SEGWIT_ACTIVATION_BLOCK = 477_120

const initialImportWalletDetailsFormValues: ImportWalletDetailsFormValues = isDevMode()
  ? {
      blockheight: 0,
      gaplimit: GAPLIMIT_SUGGESTIONS.heavy,
    }
  : {
      blockheight: SEGWIT_ACTIVATION_BLOCK,
      gaplimit: GAPLIMIT_SUGGESTIONS.default,
    }

interface ImportWalletDetailsFormProps {
  walletInfo: WalletInfo
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onSubmit: (values: ImportWalletDetailsFormValues) => Promise<void>
}

const ImportWalletDetailsForm = ({ walletInfo, submitButtonText, onSubmit }: ImportWalletDetailsFormProps) => {
  const { t, i18n } = useTranslation()

  return (
    <Formik
      initialValues={initialImportWalletDetailsFormValues}
      validate={(values) => {
        const errors = {} as FormikErrors<ImportWalletDetailsFormValues>
        if (values.blockheight < 0) {
          errors.blockheight = t('rescan_chain.feedback_invalid_blockheight', {
            min: 0,
          })
        }
        if (values.gaplimit < 1) {
          errors.gaplimit = t('rescan_chain.feedback_invalid_gaplimit', {
            min: 1,
          })
        }
        return errors
      }}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, handleBlur, handleChange, values, touched, errors, isSubmitting }) => (
        <rb.Form onSubmit={handleSubmit} noValidate lang={i18n.resolvedLanguage || i18n.language}>
          <WalletInfoSummary walletInfo={walletInfo} revealSensitiveInfo={true} />
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
              />
              <rb.Form.Control.Feedback type="invalid">{errors.blockheight}</rb.Form.Control.Feedback>
            </rb.InputGroup>
          </rb.Form.Group>
          <rb.Form.Group controlId="gaplimit" className="mb-4">
            <rb.Form.Label>{t('rescan_chain.label_gaplimit')}</rb.Form.Label>
            <rb.InputGroup hasValidation>
              <rb.InputGroup.Text id="gaplimit-addon1">
                <Sprite symbol="gaplimit" width="24" height="24" name="Gaplimit" />
              </rb.InputGroup.Text>
              <rb.Form.Control
                aria-label={t('rescan_chain.label_gaplimit')}
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
              />
              <rb.Form.Control.Feedback type="invalid">{errors.gaplimit}</rb.Form.Control.Feedback>
            </rb.InputGroup>
          </rb.Form.Group>
          <rb.Button className="w-100" variant="dark" size="lg" type="submit" disabled={isSubmitting}>
            <div className="d-flex justify-content-center align-items-center">
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
                  {submitButtonText(isSubmitting)}
                </div>
              ) : (
                submitButtonText(isSubmitting)
              )}
            </div>
          </rb.Button>
          {isSubmitting && (
            <div className="text-center text-muted small mt-4">
              <p>{t('create_wallet.hint_duration_text')}</p>
            </div>
          )}
        </rb.Form>
      )}
    </Formik>
  )
}

interface ImportWalletProps {
  startWallet: (name: Api.WalletName, token: Api.ApiToken) => void
}

export default function ImportWallet({ startWallet }: ImportWalletProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()
  const updateConfigValues = useUpdateConfigValues()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [walletNameAndPassword, setWalletNameAndPassword] = useState<{ name: string; password: string }>()
  const [mnemonicPhrase, setMnemonicPhrase] = useState<string>()
  const [recoveredWallet, setRecoveredWallet] = useState<{ walletFileName: Api.WalletName; token: Api.ApiToken }>()

  const isRecovered = useMemo(() => !!recoveredWallet?.walletFileName && recoveredWallet?.token, [recoveredWallet])
  const canRecover = useMemo(
    () => !isRecovered && !serviceInfo?.walletName && !serviceInfo?.rescanning,
    [isRecovered, serviceInfo]
  )

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
        if (isDevMode()) {
          console.debug('Will update gaplimit to', gaplimit)
        }
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

        // Step #4: invoke rescanning the timechain
        if (isDevMode()) {
          console.debug('Will start rescanning timechain from block', blockheight)
        }
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
    [setRecoveredWallet, startWallet, navigate, setAlert, updateConfigValues, t]
  )

  const step = useMemo(() => {
    if (!walletNameAndPassword) return 'input-wallet-details'
    if (!mnemonicPhrase) return 'input-mnemonic-phrase'
    return 'confirm-inputs-and-start-recovery'
  }, [walletNameAndPassword, mnemonicPhrase])

  return (
    <div className="import-wallet">
      <>
        {step === 'input-wallet-details' && <PageTitle title={t('import_wallet.wallet_details.title')} />}
        {step === 'input-mnemonic-phrase' && (
          <PageTitle
            title={t('import_wallet.mnemonic_phrase.title')}
            subtitle={t('import_wallet.mnemonic_phrase.subtitle')}
          />
        )}
        {step === 'confirm-inputs-and-start-recovery' && <PageTitle title={t('import_wallet.confirmation.title')} />}
      </>
      {!canRecover && !isRecovered && (
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
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {(canRecover || isRecovered) && (
        <>
          {step === 'input-wallet-details' && (
            <WalletCreationForm
              onSubmit={async (name, password) => setWalletNameAndPassword({ name, password })}
              submitButtonText={(isSubmitting) => (
                <>
                  {t(
                    isSubmitting
                      ? 'import_wallet.wallet_details.text_button_submitting'
                      : 'import_wallet.wallet_details.text_button_submit'
                  )}
                </>
              )}
            />
          )}
          {step === 'input-mnemonic-phrase' && (
            <MnemonicPhraseInputForm
              onSubmit={(mnemonicPhrase) => {
                setMnemonicPhrase(mnemonicPhrase)
              }}
            />
          )}
          {step === 'confirm-inputs-and-start-recovery' && (
            <ImportWalletDetailsForm
              walletInfo={{
                walletFileName: walletNameAndPassword?.name! + JM_WALLET_FILE_EXTENSION,
                password: walletNameAndPassword?.password!,
                seedphrase: mnemonicPhrase!,
              }}
              submitButtonText={(isSubmitting) => (
                <>
                  {t(
                    isSubmitting
                      ? 'import_wallet.confirmation.text_button_submitting'
                      : 'import_wallet.confirmation.text_button_submit'
                  )}
                </>
              )}
              onSubmit={(values) => {
                const abortCtrl = new AbortController()

                return recoverWallet(abortCtrl.signal, {
                  walletname: walletNameAndPassword?.name! as Api.WalletName,
                  password: walletNameAndPassword?.password!,
                  seedphrase: mnemonicPhrase!,
                  gaplimit: values.gaplimit,
                  blockheight: values.blockheight,
                })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
