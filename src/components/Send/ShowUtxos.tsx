import { useState, useEffect, useCallback, memo, useRef } from 'react'
import * as rb from 'react-bootstrap'
import { WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import { useSettings, Settings } from '../../context/SettingsContext'
import Sprite from '../Sprite'
import Alert from '../Alert'
import { useTranslation } from 'react-i18next'
import * as Api from '../../libs/JmWalletApi'
import { utxoTags } from '../jar_details/UtxoList'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'
import Balance from '../Balance'
import classNames from 'classnames'

type UtxoType = {
  address: Api.BitcoinAddress
  path: string
  label: string
  checked: boolean
  value: Api.AmountSats
  tries: number
  tries_remaining: number
  external: boolean
  mixdepth: number
  confirmations: number
  frozen: boolean
  utxo: Api.UtxoId
  locktime?: string
  _tags: { tag: string; color: string }[]
}

type UtxoList = UtxoType[]

interface ShowUtxosProps {
  wallet: CurrentWallet
  show: boolean
  onHide: () => void
  index: String
}

interface UtxoRowProps {
  utxo: UtxoType
  index: number
  onToggle: (index: number, type: 'frozen' | 'unfrozen') => void
  isFrozen: boolean
  settings: Settings
}

interface UtxoListDisplayProps {
  utxos: UtxoList
  onToggle: (index: number, type: 'frozen' | 'unfrozen') => void
  isFrozen: boolean
  settings: Settings
}

// Utility function to format Bitcoin address
const formatAddress = (address: string) => `${address.slice(0, 10)}...${address.slice(-8)}`

// Utility function to format the confirmations
const formatConfirmations = (conf: number) => {
  if (conf === 0) return { symbol: 'confs-0', confirmations: conf }
  if (conf === 1) return { symbol: 'confs-1', confirmations: conf }
  if (conf === 2) return { symbol: 'confs-2', confirmations: conf }
  if (conf === 3) return { symbol: 'confs-3', confirmations: conf }
  if (conf === 4) return { symbol: 'confs-4', confirmations: conf }
  if (conf === 5) return { symbol: 'confs-5', confirmations: conf }
  if (conf >= 9999) return { symbol: 'confs-full', confirmations: '9999+' }
  return { symbol: 'confs-full', confirmations: conf }
}

// Utility function to convert Satoshi to Bitcoin
const satsToBtc = (sats: number) => (sats / 100000000).toFixed(8)

// UTXO row component
const UtxoRow = memo(({ utxo, index, onToggle, isFrozen, settings }: UtxoRowProps) => {
  const address = formatAddress(utxo.address)
  const conf = formatConfirmations(utxo.confirmations)
  const value = satsToBtc(utxo.value)
  const tags = utxo._tags
  const rowClass = isFrozen ? styles.utxoRowFrozen : styles.utxoRowUnfrozen
  const icon = isFrozen ? 'snowflake' : 'mixed'
  const tagClass = isFrozen ? styles.utxoTagFreeze : styles.utxoTagUnFreeze

  return (
    <rb.Row key={index} onClick={() => onToggle(index, isFrozen ? 'frozen' : 'unfrozen')} className={rowClass}>
      <div className={styles.utxoListDisplay}>
        <rb.Row>
          <rb.Col xs={1}>
            <input
              id={`check-box-${isFrozen ? 'frozen' : 'unfrozen'}-${index}`}
              type="checkbox"
              defaultChecked={utxo.checked}
              className={classNames(isFrozen ? styles.squareFrozenToggleButton : styles.squareToggleButton, {
                [styles.selected]: utxo.checked,
              })}
            />
          </rb.Col>
          <rb.Col xs={1}>
            <Sprite
              symbol={icon}
              width="23px"
              height="23px"
              className={isFrozen ? styles.iconFrozen : styles.iconMixed}
            />
          </rb.Col>
          <rb.Col xs={4}>{address}</rb.Col>
          <rb.Col xs={2}>
            <Sprite
              symbol={conf.symbol}
              width="28px"
              height="28px"
              className={isFrozen ? styles.iconConfirmationsFreeze : styles.iconConfirmations}
            />
            {conf.confirmations}
          </rb.Col>
          <rb.Col xs={2} className={styles.valueColumn}>
            <Balance
              valueString={value.toString()}
              convertToUnit={settings.unit}
              showBalance={true}
              isColorChange={true}
              frozen={isFrozen}
              frozenSymbol={false}
            />
          </rb.Col>
          <rb.Col xs={1}>
            <div className={tagClass}>{tags[0].tag}</div>
          </rb.Col>
        </rb.Row>
      </div>
    </rb.Row>
  )
})

// UTXO list display component
const UtxoListDisplay = memo(({ utxos, onToggle, isFrozen, settings }: UtxoListDisplayProps) => (
  <div>
    {utxos.map((utxo, index) => (
      <UtxoRow key={index} utxo={utxo} index={index} onToggle={onToggle} isFrozen={isFrozen} settings={settings} />
    ))}
  </div>
))

// Main component to show UTXOs
const ShowUtxos = ({ wallet, show, onHide, index }: ShowUtxosProps) => {
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const settings = useSettings()

  const isHandleReloadExecuted = useRef(false)

  const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])
  const [isLoading, setisLoading] = useState<boolean>(true)

  // Load data from wallet info
  const loadData = useCallback(
    (walletInfo: WalletInfo) => {
      const data = Object.entries(walletInfo.utxosByJar).find(([key]) => key === index)
      const utxos: any = data ? data[1] : []

      const newUtxos = utxos.map((utxo: any) => ({
        ...utxo,
        id: utxo.utxo,
        _tags: utxoTags(utxo, walletInfo, t),
      }))

      const frozen = newUtxos.filter((utxo: any) => utxo.frozen).map((utxo: any) => ({ ...utxo, checked: false }))
      const unfrozen = newUtxos.filter((utxo: any) => !utxo.frozen).map((utxo: any) => ({ ...utxo, checked: true }))

      setFrozenUtxos(frozen)
      setUnFrozenUtxos(unfrozen)

      if (unfrozen.length === 0) {
        setAlert({ variant: 'danger', message: t('showUtxos.alert_for_empty_utxos') })
      } else {
        setAlert(undefined)
      }

      setisLoading(false)
    },
    [index, t],
  )

  useEffect(() => {
    const frozenUtxosToUpdate = frozenUtxos.filter((utxo: UtxoType) => utxo.checked && !utxo.locktime)
    const timeLockedUtxo = frozenUtxos.find((utxo: UtxoType) => utxo.checked && utxo.locktime)
    const allUnfrozenUnchecked = unFrozenUtxos.every((utxo: UtxoType) => !utxo.checked)

    if (timeLockedUtxo) {
      setAlert({ variant: 'danger', message: `${t('showUtxos.alert_for_time_locked')} ${timeLockedUtxo.locktime}` })
    } else if (allUnfrozenUnchecked && frozenUtxosToUpdate.length === 0 && unFrozenUtxos.length > 0) {
      setAlert({ variant: 'warning', message: t('showUtxos.alert_for_unfreeze_utxos'), dismissible: true })
    } else if (unFrozenUtxos.length !== 0) {
      setAlert(undefined)
    }
  }, [frozenUtxos, unFrozenUtxos, t])

  // Reload wallet info
  const handleReload = useCallback(async () => {
    const abortCtrl = new AbortController()
    try {
      const walletInfo = await reloadCurrentWalletInfo.reloadAll({ signal: abortCtrl.signal })
      loadData(walletInfo)
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    }
  }, [reloadCurrentWalletInfo, loadData])

  useEffect(() => {
    if (!isHandleReloadExecuted.current) {
      handleReload()
      isHandleReloadExecuted.current = true
    }
  }, [handleReload])

  // Handler to toggle UTXO selection
  const handleToggle = useCallback((utxoIndex: number, type: 'frozen' | 'unfrozen') => {
    if (type === 'unfrozen') {
      setUnFrozenUtxos((prevUtxos) =>
        prevUtxos.map((utxo, i) => (i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo)),
      )
    } else {
      setFrozenUtxos((prevUtxos) =>
        prevUtxos.map((utxo, i) => (i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo)),
      )
    }
  }, [])

  // Handler for the "Next" button click
  const handleNext = async () => {
    const abortCtrl = new AbortController()

    const frozenUtxosToUpdate = frozenUtxos
      .filter((utxo) => utxo.checked && !utxo.locktime)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: false }))
    const unFrozenUtxosToUpdate = unFrozenUtxos
      .filter((utxo) => !utxo.checked)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: true }))

    try {
      await Promise.all([
        ...frozenUtxosToUpdate.map((utxo) => Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, utxo)),
        ...unFrozenUtxosToUpdate.map((utxo) => Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, utxo)),
      ])
      await reloadCurrentWalletInfo.reloadAll({ signal: abortCtrl.signal })
      onHide()
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    }
  }

  return (
    <rb.Modal size="lg" show={show} onHide={onHide} keyboard={false} centered animation>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('showUtxos.show_utxo_title')}</rb.Modal.Title>
      </rb.Modal.Header>
      {!isLoading ? (
        <rb.Modal.Body className={styles.modalBody}>
          <div className={styles.subTitle}>{t('showUtxos.show_utxo_subtitle')}</div>
          {alert && (
            <rb.Row>
              <Alert
                variant={alert.variant}
                message={alert.message}
                dismissible={true}
                onClose={() => setAlert(undefined)}
              />
            </rb.Row>
          )}
          <UtxoListDisplay utxos={unFrozenUtxos} onToggle={handleToggle} isFrozen={false} settings={settings} />
          {frozenUtxos.length > 0 && (
            <rb.Row className="d-flex justify-content-center">
              <rb.Col xs={12}>
                <div className={mainStyles.jarsDividerContainer}>
                  <hr className={mainStyles.dividerLine} />
                  <button
                    className={mainStyles.dividerButton}
                    onClick={() => setShowFrozenUtxos((current) => !current)}
                  >
                    <Sprite symbol={showFrozenUtxos ? 'caret-up' : 'caret-down'} width="20" height="20" />
                  </button>
                  <hr className={mainStyles.dividerLine} />
                </div>
              </rb.Col>
            </rb.Row>
          )}
          {showFrozenUtxos && (
            <UtxoListDisplay utxos={frozenUtxos} onToggle={handleToggle} isFrozen={true} settings={settings} />
          )}
        </rb.Modal.Body>
      ) : (
        <div className="d-flex justify-content-center align-items-center mt-5 mb-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{t('earn.fidelity_bond.text_loading')}</div>
        </div>
      )}
      <rb.Modal.Footer>
        <rb.Button variant="white" onClick={onHide} className={styles.BackButton}>
          {t('showUtxos.back_button')}
        </rb.Button>
        <rb.Button variant="dark" onClick={handleNext} disabled={alert?.dismissible} className={styles.NextButton}>
          {t('showUtxos.next_button')}
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export default ShowUtxos
