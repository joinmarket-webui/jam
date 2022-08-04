import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'
import { useSettings } from '../../context/SettingsContext'
import { Account, Utxo, WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import { useServiceInfo } from '../../context/ServiceInfoContext'
import * as fb from '../fb/utils'
import Alert from '../Alert'
import Balance from '../Balance'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'
import { UtxoList } from './UtxoList'
import { DisplayBranchHeader, DisplayBranchBody } from './DisplayBranch'
import styles from './JarDetailsOverlay.module.css'

const TABS = {
  UTXOS: 'UTXOS',
  ACCOUNT_DETAILS: 'ACCOUNT_DETAILS',
}

type AlertContent = { message: string; variant: string; dismissible: boolean }

interface HeaderProps {
  account: Account
  nextAccount: () => void
  previousAccount: () => void
  setTab: (tab: string) => void
  onHide: () => void
  initialTab: string
}

interface UtxoDetailModalProps {
  utxo: Utxo
  status: string | null
  isShown: boolean
  close: () => void
}

interface JarDetailsOverlayProps {
  accounts: Account[]
  initialAccountIndex: number
  utxosByAccount: { [accountIndex: number]: Array<Utxo> }
  walletInfo: WalletInfo
  wallet: CurrentWallet
  isShown: boolean
  onHide: () => void
}

const Header = ({ account, nextAccount, previousAccount, setTab, onHide, initialTab }: HeaderProps) => {
  const { t } = useTranslation()

  const tabs = [
    { label: t('jar_details.title_tab_utxos'), value: TABS.UTXOS },
    { label: t('jar_details.title_tab_account'), value: TABS.ACCOUNT_DETAILS },
  ]

  return (
    <>
      <div className="w-100 d-flex flex-column flex-md-row gap-3">
        <div className="d-flex align-items-center flex-1">
          <div className="d-flex align-items-center ms-auto me-auto ms-md-0">
            <rb.Button variant="link" className={styles.accountStepperButton} onClick={() => previousAccount()}>
              <Sprite symbol="caret-left" width="20" height="20" />
            </rb.Button>
            <div className={styles.accountStepperTitle}>
              <Sprite symbol="jar-open-fill-50" width="20" height="20" />
              <span className="slashed-zeroes">#{account.account}</span>
            </div>
            <rb.Button variant="link" className={styles.accountStepperButton} onClick={() => nextAccount()}>
              <Sprite symbol="caret-right" width="20" height="20" />
            </rb.Button>
          </div>
        </div>
        <div className="d-flex align-items-center flex-grow-1 flex-shrink-0">
          <SegmentedTabs
            name="jarDetailsTab"
            tabs={tabs}
            onChange={(tab, checked) => checked && setTab(tab.value)}
            initialValue={initialTab}
          />
        </div>
        <div className="d-flex flex-1">
          <rb.Button variant="link" className="unstyled pe-0 ms-auto me-auto me-md-0" onClick={onHide}>
            <Sprite symbol="cancel" width="32" height="32" />
          </rb.Button>
        </div>
      </div>
    </>
  )
}

const UtxoDetailModal = ({ utxo, status, isShown, close }: UtxoDetailModalProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  return (
    <rb.Modal
      show={isShown}
      keyboard={true}
      onEscapeKeyDown={close}
      onHide={close}
      centered={true}
      animation={true}
      className={styles.utxoDetailModal}
      backdropClassName={styles.utxoDetailModalBackdrop}
    >
      <rb.Modal.Header className={styles.modalHeader}>
        <rb.Modal.Title className={styles.modalTitle}>
          <div>
            <div>
              <Balance
                valueString={utxo.value.toString()}
                convertToUnit={settings.unit}
                showBalance={settings.showBalance}
              />
            </div>
            <rb.Button onClick={close} className={styles.cancelButton}>
              <Sprite symbol="cancel" width="26" height="26" />
            </rb.Button>
          </div>
        </rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div>
            <strong>{t('jar_details.utxo_list.utxo_detail_label_id')}</strong>: <code>{utxo.utxo}</code>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_address')}</strong>: <code>{utxo.address}</code>
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_path')}</strong>: <code>{utxo.path}</code>
            </div>
            {utxo.label && (
              <div>
                <strong>{t('jar_details.utxo_list.utxo_detail_label_label')}</strong>: {utxo.label}
              </div>
            )}
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_value')}</strong>:{' '}
              <Balance
                valueString={utxo.value.toString()}
                convertToUnit={settings.unit}
                showBalance={settings.showBalance}
              />
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_tries')}</strong>: {utxo.tries}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_tries_remaining')}</strong>: {utxo.tries_remaining}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_is_external')}</strong>:{' '}
              {utxo.external ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_jar')}</strong>: {utxo.mixdepth}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_confirmations')}</strong>: {utxo.confirmations}
            </div>
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_is_frozen')}</strong>: {utxo.frozen ? 'Yes' : 'No'}
            </div>
            {utxo.locktime && (
              <div>
                <strong>{t('jar_details.utxo_list.utxo_detail_label_locktime')}</strong>: {utxo.locktime}
              </div>
            )}
            <div>
              <strong>{t('jar_details.utxo_list.utxo_detail_label_status')}</strong>: {status}
            </div>
          </div>
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className="d-flex justify-content-center">
        <rb.Button variant="light" onClick={close} className="w-25 d-flex justify-content-center align-items-center">
          <span>{t('global.close')}</span>
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

const JarDetailsOverlay = (props: JarDetailsOverlayProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()

  const [alert, setAlert] = useState<AlertContent | null>(null)
  const [accountIndex, setAccountIndex] = useState(props.initialAccountIndex)
  const [selectedTab, setSelectedTab] = useState(TABS.UTXOS)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false)
  const [isLoadingUnfreeze, setIsLoadingUnfreeze] = useState(false)
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Array<string>>([])
  const [detailUtxo, setDetailUtxo] = useState<Utxo | null>(null)

  const account = useMemo(() => props.accounts[accountIndex], [props.accounts, accountIndex])

  const nextAccount = useCallback(
    () => setAccountIndex((current) => (current + 1 >= props.accounts.length ? 0 : current + 1)),
    [props.accounts]
  )
  const previousAccount = useCallback(
    () => setAccountIndex((current) => (current - 1 < 0 ? props.accounts.length - 1 : current - 1)),
    [props.accounts]
  )

  useEffect(() => setAccountIndex(props.initialAccountIndex), [props.initialAccountIndex])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') previousAccount()
      else if (e.code === 'ArrowRight') nextAccount()
    },
    [previousAccount, nextAccount]
  )

  useEffect(() => {
    if (!props.isShown) return

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props.isShown, onKeyDown])

  const isTakerOrMakerRunning = useCallback(
    () => serviceInfo && (serviceInfo.makerRunning || serviceInfo.coinjoinInProgress),
    [serviceInfo]
  )

  const canBeFrozenOrUnfrozen = (utxo: Utxo) => {
    const isUnfreezeEnabled = !fb.utxo.isLocked(utxo)
    const allowedToExecute = !utxo.frozen || isUnfreezeEnabled

    return allowedToExecute
  }

  const refreshUtxos = async () => {
    if (isLoadingFreeze || isLoadingUnfreeze || isLoadingRefresh) return

    setAlert(null)
    setIsLoadingRefresh(true)

    const abortCtrl = new AbortController()

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => setIsLoadingRefresh(false))

    return () => abortCtrl.abort()
  }

  const changeSelectedUtxoFreeze = async (freeze: boolean) => {
    if (isLoadingFreeze || isLoadingUnfreeze || isLoadingRefresh || isTakerOrMakerRunning()) return

    if (selectedUtxoIds.length <= 0) return

    const selectedUtxos = (props.utxosByAccount[accountIndex] || []).filter((utxo: Utxo) =>
      selectedUtxoIds.includes(utxo.utxo)
    )

    setAlert(null)
    freeze ? setIsLoadingFreeze(true) : setIsLoadingUnfreeze(true)

    const abortCtrl = new AbortController()

    const { name: walletName, token } = props.wallet

    const freezeCalls = selectedUtxos.filter(canBeFrozenOrUnfrozen).map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
        if (!res.ok) {
          return Api.Helper.throwError(
            res,
            freeze ? t('fidelity_bond.error_freezing_utxos') : t('fidelity_bond.error_unfreezing_utxos')
          )
        }
      })
    )

    Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => {
        freeze ? setIsLoadingFreeze(false) : setIsLoadingUnfreeze(false)
      })
  }

  const utxoListTitle = () => {
    const utxos = props.utxosByAccount[accountIndex] || []

    if (utxos.length === 0) return t('jar_details.utxo_list.title_no_utxos', { jar: accountIndex })
    if (utxos.length === 1) return t('jar_details.utxo_list.title_1_utxo', { jar: accountIndex })

    return t('jar_details.utxo_list.title_num_utxos', { num: utxos.length, jar: accountIndex })
  }

  const refreshButton = () => {
    return (
      <rb.Button
        className={styles.refreshButton}
        disabled={isLoadingUnfreeze || isLoadingFreeze}
        variant={settings.theme}
        onClick={() => {
          refreshUtxos()
        }}
      >
        {isLoadingRefresh ? (
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
        ) : (
          <Sprite symbol="refresh" width="24" height="24" />
        )}
      </rb.Button>
    )
  }

  const freezeUnfreezeButton = ({ freeze }: { freeze: boolean }) => {
    const isLoading = freeze ? isLoadingFreeze : isLoadingUnfreeze

    return (
      <rb.Button
        disabled={isTakerOrMakerRunning() || isLoadingRefresh || (freeze ? isLoadingUnfreeze : isLoadingFreeze)}
        variant="light"
        onClick={() => {
          changeSelectedUtxoFreeze(freeze)
        }}
      >
        {isLoading ? (
          <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
            <div>
              {freeze
                ? t('jar_details.utxo_list.button_freeze_loading')
                : t('jar_details.utxo_list.button_unfreeze_loading')}
            </div>
          </>
        ) : (
          <>
            <Sprite symbol="snowflake" width="16" height="16" />
            <div>{freeze ? t('jar_details.utxo_list.button_freeze') : t('jar_details.utxo_list.button_unfreeze')}</div>
          </>
        )}
      </rb.Button>
    )
  }

  return (
    <rb.Offcanvas
      className={`offcanvas-fullscreen ${styles.overlayContainer}`}
      show={props.isShown}
      onHide={() => {
        props.onHide()
      }}
      keyboard={false}
      placement="bottom"
    >
      <rb.Offcanvas.Header>
        <rb.Container>
          <Header
            account={account}
            nextAccount={nextAccount}
            previousAccount={previousAccount}
            setTab={setSelectedTab}
            onHide={props.onHide}
            initialTab={selectedTab}
          />
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="md" className="py-4 py-sm-5">
          {alert && (
            <rb.Row>
              <rb.Col>
                <Alert
                  variant={alert.variant}
                  dismissible={true}
                  message={alert.message}
                  onDismissed={() => setAlert(null)}
                />
              </rb.Col>
            </rb.Row>
          )}
          {detailUtxo && (
            <UtxoDetailModal
              isShown={detailUtxo !== null}
              utxo={detailUtxo}
              status={props.walletInfo.addressSummary[detailUtxo.address]?.status}
              close={() => setDetailUtxo(null)}
            />
          )}
          <rb.Row className="justify-content-center">
            <rb.Col>
              {selectedTab === TABS.UTXOS ? (
                <div className={styles.tabContainer}>
                  <div className={styles.utxoListTitleBar}>
                    <div className="d-flex justify-content-center align-items-center gap-2">
                      {refreshButton()}
                      {utxoListTitle()}
                    </div>
                    {(props.utxosByAccount[accountIndex] || []).length > 0 && (
                      <div className={styles.freezeUnfreezeButtonsContainer}>
                        {freezeUnfreezeButton({ freeze: true })}
                        {freezeUnfreezeButton({ freeze: false })}
                      </div>
                    )}
                  </div>
                  {(props.utxosByAccount[accountIndex] || []).length > 0 && (
                    <div className="px-md-3 pb-2">
                      <UtxoList
                        utxos={props.utxosByAccount[accountIndex] || []}
                        walletInfo={props.walletInfo}
                        setSelectedUtxoIds={setSelectedUtxoIds}
                        setDetailUtxo={setDetailUtxo}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.tabContainer}>
                  <rb.Accordion flush>
                    {account.branches.map((branch, index) => (
                      <rb.Accordion.Item className={styles.accountItem} key={branch.branch} eventKey={`${index}`}>
                        <rb.Accordion.Header>
                          <DisplayBranchHeader branch={branch} />
                        </rb.Accordion.Header>
                        <rb.Accordion.Body>
                          <DisplayBranchBody branch={branch} />
                        </rb.Accordion.Body>
                      </rb.Accordion.Item>
                    ))}
                  </rb.Accordion>
                </div>
              )}
            </rb.Col>
          </rb.Row>
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}

export { JarDetailsOverlay }
