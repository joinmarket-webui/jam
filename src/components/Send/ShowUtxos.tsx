import { useState, useEffect, useCallback, memo, useRef } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { Table, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as TableTypes from '@table-library/react-table-library/types/table'
import * as Api from '../../libs/JmWalletApi'
import { WalletInfo, CurrentWallet, useReloadCurrentWalletInfo } from '../../context/WalletContext'
import { useSettings, Settings } from '../../context/SettingsContext'
import Alert from '../Alert'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import Sprite from '../Sprite'
import { utxoTags } from '../jar_details/UtxoList'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'

type Tags = 'deposit' | 'non-cj-change' | 'bond' | 'reused' | 'joined' | 'cj-out'

type UtxoType = {
  address: Api.BitcoinAddress
  path: string
  label: string
  id: string
  checked: boolean
  value: Api.AmountSats
  tries: number
  triesRemaining: number
  external: boolean
  mixdepth: number
  confirmations: number
  frozen: boolean
  utxo: Api.UtxoId
  locktime?: string
  tags: { tag: Tags; color: string }[]
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
  utxoIndex: number
  onToggle: (index: number, type: 'frozen' | 'unFrozen') => void
  isFrozen: boolean
  settings: Settings
}

interface UtxoListDisplayProps {
  utxos: UtxoList
  onToggle: (index: number, type: 'frozen' | 'unFrozen') => void
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

// Utility function to Identifies Icons
const utxoIcon = (tag: Tags, isFrozen: boolean) => {
  if (isFrozen && tag === 'bond') return 'timelock'
  if (isFrozen) return 'snowflake'
  if (tag === 'deposit' || tag === 'non-cj-change' || tag === 'reused') return 'Unmixed'
  if (tag === 'bond') return 'timelock'
  return 'mixed'
}

// Utility function to allot classes
const allotClasses = (tag: Tags, isFrozen: boolean) => {
  if (isFrozen) return { row: styles.frozenUtxo, tag: styles.utxoTagFreeze }
  if (tag === 'deposit') return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
  if (tag === 'joined' || tag === 'cj-out') return { row: styles.joinedUtxoAndCjout, tag: styles.utxoTagJoinedAndCjout }
  if (tag === 'non-cj-change' || tag === 'reused')
    return { row: styles.changeAndReuseUtxo, tag: styles.utxoTagChangeAndReuse }
  return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
}

// Utxos row component
const UtxoRow = memo(({ utxo, utxoIndex, onToggle, isFrozen, settings }: UtxoRowProps) => {
  const address = formatAddress(utxo.address)
  const conf = formatConfirmations(utxo.confirmations)
  const value = satsToBtc(utxo.value)
  const tag = utxo.tags[0].tag
  const icon = utxoIcon(tag, isFrozen)
  const rowAndTagClass = allotClasses(tag, isFrozen)
  return (
    <Row item={utxo} className={classNames(rowAndTagClass.row, 'cursor-pointer')}>
      <Cell>
        <input
          id={`check-box-${isFrozen ? 'frozen' : 'unFrozen'}-${utxoIndex}`}
          type="checkbox"
          checked={utxo.checked}
          onChange={() => onToggle(utxoIndex, isFrozen ? 'frozen' : 'unFrozen')}
          className={classNames(isFrozen ? styles.squareFrozenToggleButton : styles.squareToggleButton, {
            [styles.selected]: utxo.checked,
          })}
        />
      </Cell>
      <Cell>
        <Sprite symbol={icon} width="23px" height="23px" />
      </Cell>
      <Cell>{address}</Cell>
      <Cell>
        <Sprite symbol={conf.symbol} width="28px" height="28px" className="mb-1" />
        {conf.confirmations}
      </Cell>
      <Cell>
        <Balance
          valueString={value.toString()}
          convertToUnit={settings.unit}
          showBalance={true}
          isColorChange={true}
          frozen={isFrozen}
          frozenSymbol={false}
        />
      </Cell>
      <Cell>
        <div className={classNames(rowAndTagClass.tag, 'd-inline-block')}>{tag}</div>
      </Cell>
    </Row>
  )
})

//Table theme to manage view
const TABLE_THEME = {
  Table: `
    font-size: 1rem;
    --data-table-library_grid-template-columns: 3.5rem 2.5rem 12rem 2fr 3fr 10rem ;
    @media only screen and (min-width: 768px) {
      --data-table-library_grid-template-columns: 3.5rem 2.5rem 14rem 5fr 3fr 10rem ;
    }
  `,
  BaseCell: `
    padding: 0.55rem 0.35rem !important;
    margin: 0.15rem 0px !important;
  `,
}

//Utxo list display component
const UtxoListDisplay = ({ utxos, onToggle, isFrozen, settings }: UtxoListDisplayProps) => {
  const tableTheme = useTheme(TABLE_THEME)

  return (
    <div className={classNames(styles.utxoListDisplayHeight, styles.customscrollbar, 'overflow-y-auto')}>
      <Table data={{ nodes: utxos }} theme={tableTheme} layout={{ custom: true, horizontalScroll: true }}>
        {(utxosList: TableTypes.TableProps<UtxoType>) => (
          <Body>
            {utxosList.map((utxo: UtxoType, index: number) => {
              return (
                <Row key={index} item={utxo} onClick={() => onToggle(index, isFrozen ? 'frozen' : 'unFrozen')}>
                  <UtxoRow utxo={utxo} utxoIndex={index} onToggle={onToggle} isFrozen={isFrozen} settings={settings} />
                </Row>
              )
            })}
          </Body>
        )}
      </Table>
    </div>
  )
}

// Main component to show UTXOs
const ShowUtxos = ({ wallet, show, onHide, index }: ShowUtxosProps) => {
  const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])
  const [isLoading, setisLoading] = useState<boolean>(true)
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const settings = useSettings()

  const isHandleReloadExecuted = useRef(false)

  // Load data from wallet info
  const loadData = useCallback(
    (walletInfo: WalletInfo) => {
      const data = Object.entries(walletInfo.utxosByJar).find(([key]) => key === index)
      const utxos: any = data ? data[1] : []

      const newUtxos = utxos.map((utxo: any) => ({
        ...utxo,
        id: utxo.utxo,
        tags: utxoTags(utxo, walletInfo, t),
      }))
      const frozen = newUtxos.filter((utxo: any) => utxo.frozen).map((utxo: any) => ({ ...utxo, checked: false }))
      const unfrozen = newUtxos.filter((utxo: any) => !utxo.frozen).map((utxo: any) => ({ ...utxo, checked: true }))

      setFrozenUtxos(frozen)
      setUnFrozenUtxos(unfrozen)

      if (unfrozen.length === 0) {
        setAlert({ variant: 'danger', message: t('showUtxos.alertForEmptyUtxos') })
      } else {
        setAlert(undefined)
      }

      setisLoading(false)
    },
    [index, t],
  )

  // Reload wallet info
  const handleReload = useCallback(async () => {
    setisLoading(true)
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

  //Effect to Reload walletInfo
  useEffect(() => {
    if (!isHandleReloadExecuted.current) {
      handleReload()
      isHandleReloadExecuted.current = true
    }
  }, [handleReload])

  //Effect to set Alert according to the walletInfo
  useEffect(() => {
    const frozenUtxosToUpdate = frozenUtxos.filter((utxo: UtxoType) => utxo.checked && !utxo.locktime)
    const timeLockedUtxo = frozenUtxos.find((utxo: UtxoType) => utxo.checked && utxo.locktime)
    const allUnfrozenUnchecked = unFrozenUtxos.every((utxo: UtxoType) => !utxo.checked)

    if (timeLockedUtxo) {
      setAlert({ variant: 'danger', message: `${t('showUtxos.alertForTimeLocked')} ${timeLockedUtxo.locktime}` })
    } else if (allUnfrozenUnchecked && frozenUtxosToUpdate.length === 0 && unFrozenUtxos.length > 0) {
      setAlert({ variant: 'warning', message: t('showUtxos.alertForUnfreezeUtxos'), dismissible: true })
    } else if (unFrozenUtxos.length !== 0) {
      setAlert(undefined)
    }
  }, [frozenUtxos, unFrozenUtxos, t])

  // Handler to toggle UTXO selection
  const handleToggle = useCallback((utxoIndex: number, type: 'frozen' | 'unFrozen') => {
    if (type === 'unFrozen') {
      setUnFrozenUtxos((prevUtxos) =>
        prevUtxos.map((utxo, i) => (i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo)),
      )
    } else {
      setFrozenUtxos((prevUtxos) =>
        prevUtxos.map((utxo, i) => (i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo)),
      )
    }
  }, [])

  // Handler for the "confirm" button click
  const handleConfirm = async () => {
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
      await handleReload()
      onHide()
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    }
  }

  return (
    <ConfirmModal
      onCancel={onHide}
      onConfirm={handleConfirm}
      disabled={alert?.dismissible || isLoading}
      isShown={show}
      title={t('showUtxos.showUtxoTitle')}
      size="lg"
      showCloseButtonAndRemoveClassName={true}
      confirmVariant={'dark'}
    >
      {!isLoading ? (
        <>
          <div className={classNames(styles.subTitle, 'm-3 mb-4 text-start')}>{t('showUtxos.showUtxoSubtitle')}</div>
          {alert && (
            <rb.Row>
              <Alert
                variant={alert.variant}
                message={alert.message}
                dismissible={!alert.dismissible}
                onClose={() => setAlert(undefined)}
              />
            </rb.Row>
          )}
          <UtxoListDisplay utxos={unFrozenUtxos} onToggle={handleToggle} isFrozen={false} settings={settings} />
          {frozenUtxos.length > 0 && (
            <rb.Row className={classNames('d-flex justify-content-center mt-4', { 'mb-4': showFrozenUtxos })}>
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
        </>
      ) : (
        <div className="d-flex justify-content-center align-items-center mt-5 mb-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{t('earn.fidelity_bond.text_loading')}</div>
        </div>
      )}
    </ConfirmModal>
  )
}

export default ShowUtxos
