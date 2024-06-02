import { useState, useEffect, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import Sprite from '../Sprite'
import Alert from '../Alert'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import * as Api from '../../libs/JmWalletApi'
import { utxoTags } from '../jar_details/UtxoList'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'

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
}

type UtxoList = UtxoType[]

interface SignModalProps {
  walletInfo: WalletInfo
  wallet: CurrentWallet
  show: boolean
  onHide: () => void
  index: String
}

interface UtxoRowProps {
  utxo: UtxoType
  index: number
  onToggle: (index: number, type: 'frozen' | 'unfrozen') => void
  walletInfo: WalletInfo
  t: TFunction
  isFrozen: boolean
}

interface UtxoListDisplayProps {
  utxos: UtxoList
  onToggle: (index: number, type: 'frozen' | 'unfrozen') => void
  walletInfo: WalletInfo
  t: TFunction
  isFrozen: boolean
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

const UtxoRow = ({ utxo, index, onToggle, walletInfo, t, isFrozen }: UtxoRowProps) => {
  const address = formatAddress(utxo.address)
  const conf = formatConfirmations(utxo.confirmations)
  const value = satsToBtc(utxo.value)
  const tags = utxoTags(utxo, walletInfo, t)
  const rowClass = isFrozen ? styles.utxoRowFrozen : styles.utxoRowUnfrozen
  const icon = isFrozen ? 'snowflake' : 'mixed'
  const tagClass = isFrozen ? styles.utxoTagFreeze : styles.utxoTagUnFreeze

  return (
    <rb.Row key={index} onClick={() => onToggle(index, isFrozen ? 'frozen' : 'unfrozen')} className={rowClass}>
      <rb.Col xs={1}>
        <rb.ToggleButton
          id={`check-box-${isFrozen ? 'frozen' : 'unfrozen'}-${index}`}
          checked={utxo.checked}
          type="checkbox"
          value=""
          variant="outline-dark"
          onChange={() => onToggle(index, isFrozen ? 'frozen' : 'unfrozen')}
          className={isFrozen ? styles.squareFrozenToggleButton : styles.squareToggleButton}
        />
      </rb.Col>
      <rb.Col xs={1}>
        <Sprite symbol={icon} width="23px" height="23px" className={isFrozen ? styles.iconFrozen : styles.iconMixed} />
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
      <rb.Col xs={2} className={styles.valueColumn}>{`₿${value}`}</rb.Col>
      <rb.Col xs={1}>
        <div className={tagClass}>{tags[0].tag}</div>
      </rb.Col>
    </rb.Row>
  )
}

const UtxoListDisplay = ({ utxos, onToggle, walletInfo, t, isFrozen }: UtxoListDisplayProps) => (
  <div>
    {utxos.map((utxo, index) => (
      <UtxoRow
        key={index}
        utxo={utxo}
        index={index}
        onToggle={onToggle}
        walletInfo={walletInfo}
        t={t}
        isFrozen={isFrozen}
      />
    ))}
  </div>
)

const ShowUtxos = ({ walletInfo, wallet, show, onHide, index }: SignModalProps) => {
  const abortCtrl = new AbortController()

  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])

  // Effect to load UTXO data when component mounts or index/walletInfo changes
  useEffect(() => {
    const loadData = () => {
      const data = Object.entries(walletInfo.utxosByJar).find(([key]) => key === index)
      const utxos = data ? data[1] : []

      const frozen = utxos.filter((utxo) => utxo.frozen).map((utxo) => ({ ...utxo, checked: false }))
      const unfrozen = utxos.filter((utxo) => !utxo.frozen).map((utxo) => ({ ...utxo, checked: true }))

      setFrozenUtxos(frozen)
      setUnFrozenUtxos(unfrozen)

      if (utxos && unfrozen.length === 0) {
        setAlert({ variant: 'danger', message: t('showUtxos.alert_for_empty_utxos'), dismissible: true })
      } else {
        setAlert(undefined)
      }
    }

    loadData()
  }, [index, walletInfo.utxosByJar, t])

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
    const frozenUtxosToUpdate = frozenUtxos
      .filter((utxo) => utxo.checked && !utxo.locktime)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: false }))
    const unFrozenUtxosToUpdate = unFrozenUtxos
      .filter((utxo) => !utxo.checked)
      .map((utxo) => ({ utxo: utxo.utxo, freeze: true }))

    for (const utxo of frozenUtxos) {
      if (utxo.checked && utxo.locktime) {
        setAlert({
          variant: 'danger',
          message: `${t('showUtxos.alert_for_time_locked')} ${utxo.locktime}`,
          dismissible: true,
        })
        return
      }
    }

    if (frozenUtxosToUpdate.length >= 1) {
      try {
        const freezeCalls = frozenUtxosToUpdate.map((utxo) =>
          Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, { utxo: utxo.utxo, freeze: utxo.freeze }).then(
            (res) => {
              if (!res.ok) {
                return Api.Helper.throwError(res)
              }
            },
          ),
        )

        await Promise.all(freezeCalls)
      } catch (err: any) {
        if (!abortCtrl.signal.aborted) {
          setAlert({ variant: 'danger', message: err.message, dismissible: true })
        }
        return
      }
    }

    const uncheckedUnfrozen = unFrozenUtxos.filter((utxo) => !utxo.checked)
    if (uncheckedUnfrozen.length === unFrozenUtxos.length && frozenUtxosToUpdate.length === 0) {
      setAlert({ variant: 'danger', message: t('showUtxos.alert_for_unfreeze_utxos'), dismissible: true })
      return
    }

    try {
      const unfreezeCalls = unFrozenUtxosToUpdate.map((utxo) =>
        Api.postFreeze({ ...wallet, signal: abortCtrl.signal }, { utxo: utxo.utxo, freeze: utxo.freeze }).then(
          (res) => {
            if (!res.ok) {
              return Api.Helper.throwError(res)
            }
          },
        ),
      )

      await Promise.all(unfreezeCalls)
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    }

    await reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal })
    onHide()
  }

  return (
    <rb.Modal size="lg" show={show} onHide={onHide} keyboard={false} centered animation>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('showUtxos.show_utxo_title')}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
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
        <UtxoListDisplay utxos={unFrozenUtxos} onToggle={handleToggle} walletInfo={walletInfo} t={t} isFrozen={false} />
        <rb.Row className="d-flex justify-content-center">
          <rb.Col xs={12}>
            <div className={mainStyles.jarsDividerContainer}>
              <hr className={mainStyles.dividerLine} />
              <button className={mainStyles.dividerButton} onClick={() => setShowFrozenUtxos((current) => !current)}>
                <Sprite symbol={showFrozenUtxos ? 'caret-up' : 'caret-down'} width="20" height="20" />
              </button>
              <hr className={mainStyles.dividerLine} />
            </div>
          </rb.Col>
        </rb.Row>
        {showFrozenUtxos && (
          <UtxoListDisplay utxos={frozenUtxos} onToggle={handleToggle} walletInfo={walletInfo} t={t} isFrozen={true} />
        )}
      </rb.Modal.Body>
      <rb.Modal.Footer>
        <rb.Button variant="white" onClick={onHide} className={styles.BackButton}>
          {t('showUtxos.back_button')}
        </rb.Button>
        <rb.Button variant="dark" onClick={handleNext} className={styles.NextButton}>
          {t('showUtxos.next_button')}
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export default ShowUtxos
