import { useState, useEffect, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'
import { useSettings } from '../../context/SettingsContext'
import { Account, Utxo, WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import { useServiceInfo } from '../../context/ServiceInfoContext'
import * as fb from '../fb/utils'
import Alert, { SimpleMessageAlertProps } from '../Alert'
import Balance from '../Balance'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'
import UtxoDetailModal from './UtxoDetailModule'
import { UtxoList } from './UtxoList'
import { DisplayBranchHeader, DisplayBranchBody } from './DisplayBranch'
import { JarIndex, jarInitial } from '../jars/Jar'
import styles from './JarDetailsOverlay.module.css'

const TABS = {
  UTXOS: 'UTXOS',
  ACCOUNT_DETAILS: 'ACCOUNT_DETAILS',
}

interface HeaderProps {
  account: Account
  nextAccount: () => void
  previousAccount: () => void
  setTab: (tab: string) => void
  onHide: () => void
  initialTab: string
}

interface JarDetailsOverlayProps {
  accounts: Account[]
  initialJarIndex: JarIndex
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
              <span className="slashed-zeroes">
                <strong>{jarInitial(Number(account.account))}</strong>
              </span>
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
          <rb.Button variant="link" className="unstyled px-0 ms-auto me-auto me-md-0" onClick={onHide}>
            <Sprite symbol="cancel" width="32" height="32" />
          </rb.Button>
        </div>
      </div>
    </>
  )
}

const JarDetailsOverlay = (props: JarDetailsOverlayProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()

  const [alert, setAlert] = useState<SimpleMessageAlertProps | null>(null)
  const [jarIndex, setAccountIndex] = useState(props.initialJarIndex)
  const [selectedTab, setSelectedTab] = useState(TABS.UTXOS)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false)
  const [isLoadingUnfreeze, setIsLoadingUnfreeze] = useState(false)
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Array<string>>([])
  const [detailUtxo, setDetailUtxo] = useState<Utxo | null>(null)

  const account = useMemo(() => props.accounts[jarIndex], [props.accounts, jarIndex])
  const utxos = useMemo(() => props.walletInfo.utxosByJar[jarIndex] || [], [props.walletInfo, jarIndex])
  const selectedUtxos = useMemo(
    () => utxos.filter((utxo: Utxo) => selectedUtxoIds.includes(utxo.utxo)),
    [utxos, selectedUtxoIds]
  )
  const selectedUtxosBalance: Api.AmountSats = useMemo(() => {
    return selectedUtxos.map((it) => it.value).reduce((acc, curr) => acc + curr, 0)
  }, [selectedUtxos])

  const nextAccount = useCallback(
    () => setAccountIndex((current) => (current + 1 >= props.accounts.length ? 0 : current + 1)),
    [props.accounts]
  )
  const previousAccount = useCallback(
    () => setAccountIndex((current) => (current - 1 < 0 ? props.accounts.length - 1 : current - 1)),
    [props.accounts]
  )

  useEffect(() => setAccountIndex(props.initialJarIndex), [props.initialJarIndex])
  useEffect(() => {
    // reset selected utxos when switching jars
    setSelectedUtxoIds([])
  }, [jarIndex])

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

  const isTakerOrMakerRunning = useMemo(
    () => serviceInfo && (serviceInfo.makerRunning || serviceInfo.coinjoinInProgress),
    [serviceInfo]
  )

  /**
   * Always allow freezing UTXOs.
   * Only allow unfreezing for non-timelocked UTXOs.
   *
   * Expired, unfrozen FBs cannot be used in taker or maker
   * operation. Hence, unfreezing of FBs is forbidden in this
   * component. The FB should be spent (unfreeze and sweep)
   * via other mechanisms (_not_ in this component).
   *
   * @param utxo UTXO to check whether freez/unfreeze is allowed
   * @returns true when UTXO can be frozen/unfrozen
   */
  const canBeFrozenOrUnfrozen = (utxo: Utxo) => {
    const isUnfreezeEnabled = !fb.utxo.isFidelityBond(utxo)
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
    if (isLoadingFreeze || isLoadingUnfreeze || isLoadingRefresh || isTakerOrMakerRunning) return

    if (selectedUtxos.length <= 0) return

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
    return t('jar_details.utxo_list.title', { count: utxos.length, jar: jarInitial(jarIndex) })
  }

  const refreshButton = () => {
    return (
      <rb.Button
        className={styles.refreshButton}
        disabled={isLoadingRefresh || isLoadingUnfreeze || isLoadingFreeze}
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
    const isDisabled =
      isLoadingRefresh || isLoadingFreeze || isLoadingUnfreeze || isTakerOrMakerRunning || selectedUtxos.length <= 0

    return (
      <rb.Button
        disabled={isDisabled}
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
      onHide={props.onHide}
      keyboard={false}
      placement="bottom"
    >
      <rb.Offcanvas.Header>
        <rb.Container fluid="lg">
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
        <rb.Container fluid="lg" className="py-3">
          {alert && (
            <rb.Row>
              <rb.Col>
                <Alert
                  variant={alert.variant}
                  dismissible={true}
                  message={alert.message}
                  onClose={() => setAlert(null)}
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
            <rb.Col className="px-0">
              <div className={styles.tabContainer}>
                {selectedTab === TABS.UTXOS ? (
                  <>
                    <div className={styles.utxoListTitleBar}>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                        {refreshButton()}
                        {utxoListTitle()}
                      </div>
                      <div className={styles.operationsContainer}>
                        {utxos.length > 0 && (
                          <div className={styles.freezeUnfreezeButtonsContainer}>
                            {freezeUnfreezeButton({ freeze: true })}
                            {freezeUnfreezeButton({ freeze: false })}
                          </div>
                        )}
                        {selectedUtxosBalance > 0 && (
                          <div className={styles.selectedUtxosSumContainer}>
                            <Trans i18nKey="jar_details.utxo_list.text_balance_sum_selected">
                              <Balance
                                valueString={String(selectedUtxosBalance)}
                                convertToUnit={settings.unit}
                                showBalance={settings.showBalance}
                              />
                            </Trans>
                          </div>
                        )}
                      </div>
                    </div>
                    {utxos.length > 0 && (
                      <div className="px-md-3 pb-2">
                        <UtxoList
                          utxos={utxos}
                          walletInfo={props.walletInfo}
                          selectState={{ ids: selectedUtxoIds }}
                          setSelectedUtxoIds={setSelectedUtxoIds}
                          setDetailUtxo={setDetailUtxo}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <rb.Accordion flush className="p-3 p-lg-0">
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
                )}
              </div>
            </rb.Col>
          </rb.Row>
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}

export { JarDetailsOverlay }
