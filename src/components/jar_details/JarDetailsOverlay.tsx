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
import { jarInitial, jarName } from '../jars/Jar'
import styles from './JarDetailsOverlay.module.css'

const TABS = {
  UTXOS: 'UTXOS',
  JAR_DETAILS: 'JAR_DETAILS',
}

interface HeaderProps {
  jar: Account
  nextJar: () => void
  previousJar: () => void
  onHide: () => void
  isInitializing: boolean
}

const Header = ({ jar, nextJar, previousJar, onHide, isInitializing }: HeaderProps) => {
  return (
    <>
      <div className="w-100 d-flex flex-column justify-content-between flex-md-row gap-3">
        <div className="w-25" />
        <div className="d-flex align-items-center">
          <div className="d-flex align-items-center ms-auto me-auto ms-md-0 position-relative">
            <rb.Button variant="link" className={styles.jarStepperButton} onClick={() => previousJar()}>
              <Sprite symbol="caret-left" width="20" height="20" />
            </rb.Button>
            <div className={styles.accountStepperTitle}>
              <Sprite symbol="jar-open-fill-50" width="20" height="20" />
              <span className="slashed-zeroes">
                <strong>{jarName(Number(jar.account))}</strong>
              </span>
            </div>
            <rb.Button variant="link" className={styles.jarStepperButton} onClick={() => nextJar()}>
              <Sprite symbol="caret-right" width="20" height="20" />
            </rb.Button>
            {isInitializing && (
              <div className="position-absolute start-100">
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="ms-3" />
              </div>
            )}
          </div>
        </div>
        <div className={styles.closeButton}>
          <rb.Button variant="link" className="unstyled px-0 ms-auto me-auto me-md-0" onClick={onHide}>
            <Sprite symbol="cancel" width="32" height="32" />
          </rb.Button>
        </div>
      </div>
    </>
  )
}

interface JarDetailsOverlayProps {
  jars: Account[]
  initialJarIndex: JarIndex
  walletInfo: WalletInfo
  wallet: CurrentWallet
  isShown: boolean
  onHide: () => void
}

const JarDetailsOverlay = (props: JarDetailsOverlayProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()

  const [alert, setAlert] = useState<SimpleMessageAlertProps>()
  const [jarIndex, setJarIndex] = useState(props.initialJarIndex)
  const [selectedTab, setSelectedTab] = useState(TABS.UTXOS)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false)
  const [isLoadingUnfreeze, setIsLoadingUnfreeze] = useState(false)
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Array<string>>([])
  const [detailUtxo, setDetailUtxo] = useState<Utxo>()

  const tabs = [
    { label: t('jar_details.title_tab_utxos'), value: TABS.UTXOS },
    { label: t('jar_details.title_tab_jar_details'), value: TABS.JAR_DETAILS },
  ]

  const jar = useMemo(() => props.jars[jarIndex], [props.jars, jarIndex])
  const utxos = useMemo(() => props.walletInfo.utxosByJar[jarIndex] || [], [props.walletInfo, jarIndex])
  const selectedUtxos = useMemo(
    () => utxos.filter((utxo: Utxo) => selectedUtxoIds.includes(utxo.utxo)),
    [utxos, selectedUtxoIds]
  )
  const selectedUtxosBalance: Api.AmountSats = useMemo(() => {
    return selectedUtxos.map((it) => it.value).reduce((acc, curr) => acc + curr, 0)
  }, [selectedUtxos])

  const nextJar = useCallback(
    () => setJarIndex((current) => (current + 1 >= props.jars.length ? 0 : current + 1)),
    [props.jars]
  )
  const previousJar = useCallback(
    () => setJarIndex((current) => (current - 1 < 0 ? props.jars.length - 1 : current - 1)),
    [props.jars]
  )

  useEffect(() => {
    if (!props.isShown) return

    const abortCtrl = new AbortController()

    setIsInitializing(true)
    reloadCurrentWalletInfo
      .reloadAll({ signal: abortCtrl.signal })
      .catch((err) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return
        setIsInitializing(false)
      })

    return () => abortCtrl.abort()
  }, [props.isShown, reloadCurrentWalletInfo])

  useEffect(() => setJarIndex(props.initialJarIndex), [props.initialJarIndex])
  useEffect(() => {
    // reset selected utxos when switching jars
    setSelectedUtxoIds([])
  }, [jarIndex])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') previousJar()
      else if (e.code === 'ArrowRight') nextJar()
    },
    [previousJar, nextJar]
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
   * Always allow freezing, but only allow unfreezing of non-timelocked UTXOs.
   *
   * Expired, unfrozen FBs cannot be used in taker or maker operation. Hence,
   * unfreezing of FBs is forbidden in this component. The FB should be spent
   * (unfreeze and sweep) via other mechanisms (_not_ in this component).
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

    setAlert(undefined)
    setIsLoadingRefresh(true)

    const abortCtrl = new AbortController()

    reloadCurrentWalletInfo
      .reloadUtxos({ signal: abortCtrl.signal })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoadingRefresh(false))

    return () => abortCtrl.abort()
  }

  const changeSelectedUtxoFreeze = async (freeze: boolean) => {
    if (isLoadingFreeze || isLoadingUnfreeze || isLoadingRefresh || isTakerOrMakerRunning) return

    if (selectedUtxos.length <= 0) return

    setAlert(undefined)
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
      .then((_) => reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal }))
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
            jar={jar}
            nextJar={nextJar}
            previousJar={previousJar}
            onHide={props.onHide}
            isInitializing={isInitializing}
          />
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="lg" className="py-3">
          <div className="d-flex align-items-center flex-grow-1 flex-shrink-0 w-100 justify-content-center">
            <div className="mb-3">
              <SegmentedTabs
                name="jarDetailsTab"
                tabs={tabs}
                onChange={(tab, checked) => checked && setSelectedTab(tab.value)}
                initialValue={selectedTab}
                bgLightDark={true}
              />
            </div>
          </div>
          {alert && (
            <rb.Row>
              <rb.Col>
                <Alert
                  variant={alert.variant}
                  dismissible={true}
                  message={alert.message}
                  onClose={() => setAlert(undefined)}
                />
              </rb.Col>
            </rb.Row>
          )}
          {detailUtxo && (
            <UtxoDetailModal
              isShown={detailUtxo !== undefined}
              utxo={detailUtxo}
              status={props.walletInfo.addressSummary[detailUtxo.address]?.status}
              close={() => setDetailUtxo(undefined)}
            />
          )}
          <rb.Row className="justify-content-center">
            <rb.Col className="px-0">
              <div className={styles.tabContainer}>
                {selectedTab === TABS.UTXOS ? (
                  <>
                    <div className={styles.utxoListTitleBar}>
                      <div className="d-flex justify-content-between align-items-center w-100 flex-sm-row flex-column">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                          {refreshButton()}
                          {utxoListTitle()}
                        </div>
                        <div>
                          <Trans i18nKey="jar_details.utxo_list.text_balance_sum_total">
                            <Balance
                              valueString={jar.account_balance}
                              convertToUnit={settings.unit}
                              showBalance={settings.showBalance}
                            />
                          </Trans>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center w-100 flex-sm-row flex-column gap-2">
                        {utxos.length > 0 && (
                          <div className="order-1 order-sm-0">
                            <div className={styles.freezeUnfreezeButtonsContainer}>
                              {freezeUnfreezeButton({ freeze: true })}
                              {freezeUnfreezeButton({ freeze: false })}
                            </div>
                          </div>
                        )}
                        {selectedUtxosBalance > 0 && (
                          <div className="order-0 order-sm-1">
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
                    {jar.branches.map((branch, index) => (
                      <rb.Accordion.Item className={styles.jarItem} key={branch.branch} eventKey={`${index}`}>
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
