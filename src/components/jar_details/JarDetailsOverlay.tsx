import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'
import { Account, Utxo, WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'
import { UtxoList } from './UtxoList'
import styles from './JarDetailsOverlay.module.css'

const TABS = {
  UTXOS: 'UTXOS',
  ACCOUNT_DETAILS: 'ACCOUNT_DETAILS',
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

interface HeaderProps {
  account: Account
  nextAccount: () => void
  previousAccount: () => void
  setTab: (tab: string) => void
  onHide: () => void
}

const Header = ({ account, nextAccount, previousAccount, setTab, onHide }: HeaderProps) => {
  const { t } = useTranslation()

  const tabs = [
    { label: 'UTXOs', value: TABS.UTXOS },
    { label: 'Account Details', value: TABS.ACCOUNT_DETAILS },
  ]

  return (
    <>
      <div className="w-100 d-flex flex-column flex-md-row gap-3">
        <div className="d-flex align-items-center flex-1">
          <rb.Button variant="link" className="unstyled ps-0 ms-auto mx-md-0 me-auto" onClick={onHide}>
            <span>{t('global.close')}</span>
          </rb.Button>
        </div>
        <div className="d-flex align-items-center flex-grow-1 flex-shrink-0">
          <SegmentedTabs
            name="jarDetailsTab"
            tabs={tabs}
            onChange={(tab, checked) => checked && setTab(tab.value)}
            initialValue={TABS.UTXOS}
          />
        </div>
        <div className="d-flex flex-1">
          <div className="d-flex align-items-center ms-auto me-auto me-md-0">
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
      </div>
    </>
  )
}

const JarDetailsOverlay = (props: JarDetailsOverlayProps) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [accountIndex, setAccountIndex] = useState(props.initialAccountIndex)
  const [selectedTab, setSelectedTab] = useState(TABS.UTXOS)
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false)
  const [isLoadingUnfreeze, setIsLoadingUnfreeze] = useState(false)
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Array<string>>([])

  const account = useMemo(() => props.accounts[accountIndex], [props.accounts, accountIndex])

  const nextAccount = useCallback(
    () => setAccountIndex((current) => (current + 1 >= props.accounts.length ? 0 : current + 1)),
    [props.accounts]
  )
  const previousAccount = useCallback(
    () => setAccountIndex((current) => (current - 1 < 0 ? props.accounts.length - 1 : current - 1)),
    [props.accounts]
  )

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

  const changeSelectedUtxoFreeze = async (freeze: boolean) => {
    if (selectedUtxoIds.length <= 0) return

    const selectedUtxos = (props.utxosByAccount[accountIndex] || []).filter((utxo: Utxo) =>
      selectedUtxoIds.includes(utxo.utxo)
    )

    freeze ? setIsLoadingFreeze(true) : setIsLoadingUnfreeze(true)

    const abortCtrl = new AbortController()

    const { name: walletName, token } = props.wallet

    const freezeCalls = selectedUtxos.map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
        if (!res.ok) {
          return Api.Helper.throwError(res, freeze ? 'error_freezing_utxos' : 'error_unfreezing_utxos')
        }
      })
    )

    Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        // setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => {
        freeze ? setIsLoadingFreeze(false) : setIsLoadingUnfreeze(false)
      })
  }

  const utxoListTitle = () => {
    const utxos = props.utxosByAccount[accountIndex] || []

    if (utxos.length === 0) return `No UTXOs in Jar #${accountIndex}`
    if (utxos.length === 1) return `1 UTXO in Jar #${accountIndex}`

    return `${utxos.length} UTXOs in Jar #${accountIndex}`
  }

  const freezeUnfreezeButton = ({ freeze }: { freeze: boolean }) => {
    const isLoading = freeze ? isLoadingFreeze : isLoadingUnfreeze
    return (
      <rb.Button
        disabled={freeze ? isLoadingUnfreeze : isLoadingFreeze}
        variant="light"
        onClick={() => {
          changeSelectedUtxoFreeze(freeze)
        }}
      >
        {isLoading ? (
          <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
            <div>{freeze ? 'Freezing...' : 'Unfreezing...'}</div>
          </>
        ) : (
          <>
            <Sprite symbol="snowflake" width="16" height="16" />
            <div>{freeze ? 'Freeze selected' : 'Unfreeze selected'}</div>
          </>
        )}
      </rb.Button>
    )
  }

  return (
    <rb.Offcanvas
      className={styles.overlayContainer}
      show={props.isShown}
      onHide={props.onHide}
      keyboard={false}
      placement="bottom"
    >
      <rb.Offcanvas.Header className={styles.overlayHeader}>
        <rb.Container>
          <Header
            account={account}
            nextAccount={nextAccount}
            previousAccount={previousAccount}
            setTab={setSelectedTab}
            onHide={props.onHide}
          />
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body className={styles.overlayBody}>
        <rb.Container className="py-4 py-sm-5">
          <rb.Row className="justify-content-center">
            <rb.Col>
              <div className={styles.utxoListContainer}>
                <div className={styles.utxoListTitleBar}>
                  <div>{utxoListTitle()}</div>
                  {(props.utxosByAccount[accountIndex] || []).length > 0 && (
                    <div className={styles.freezeUnfreezeButtonsContainer}>
                      {freezeUnfreezeButton({ freeze: true })}
                      {freezeUnfreezeButton({ freeze: false })}
                    </div>
                  )}
                </div>
                {(props.utxosByAccount[accountIndex] || []).length > 0 && (
                  <div className="px-md-3">
                    <UtxoList
                      utxos={props.utxosByAccount[accountIndex] || []}
                      walletInfo={props.walletInfo}
                      setSelectedUtxoIds={setSelectedUtxoIds}
                    />
                  </div>
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
