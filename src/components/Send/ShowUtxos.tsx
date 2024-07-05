import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import classNames from 'classnames'
import { Table, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as TableTypes from '@table-library/react-table-library/types/table'
import * as Api from '../../libs/JmWalletApi'
import {
  WalletInfo,
  CurrentWallet,
  useReloadCurrentWalletInfo,
  Utxo,
  useCurrentWalletInfo,
} from '../../context/WalletContext'
import { useSettings, Settings } from '../../context/SettingsContext'
import Alert from '../Alert'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import Sprite from '../Sprite'
import { utxoTags } from '../jar_details/UtxoList'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'

type UtxoList = Array<Utxo>

interface ShowUtxosProps {
  wallet: CurrentWallet
  show: boolean
  onHide: () => void
  index: String
}

interface UtxoRowProps {
  utxo: Utxo
  utxoIndex: number
  onToggle?: (index: number, isFrozen: boolean) => void
  isFrozen: boolean
  settings: Settings
  showRadioButton: boolean
  showBackground: boolean
  walletInfo: WalletInfo
  t: TFunction
}

interface UtxoListDisplayProps {
  utxos: Array<Utxo>
  onToggle?: (index: number, isFrozen: boolean) => void
  settings: Settings
  showRadioButton: boolean
  showBackground: boolean
}

interface DividerProps {
  isState: boolean
  setIsState: (arg: boolean) => void
  className?: string
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
  if (conf > 9999) return { symbol: 'confs-full', confirmations: '9999+' }
  return { symbol: 'confs-full', confirmations: conf }
}

// Utility function to convert Satoshi to Bitcoin
const satsToBtc = (sats: number) => (sats / 100000000).toFixed(8)

// Utility function to Identifies Icons
const utxoIcon = (tag: string, isFrozen: boolean) => {
  if (isFrozen && tag === 'bond') return 'timelock'
  if (isFrozen) return 'snowflake'
  if (tag === 'deposit' || tag === 'non-cj-change' || tag === 'reused') return 'Unmixed'
  if (tag === 'bond') return 'timelock'
  return 'mixed'
}

// Utility function to allot classes
const allotClasses = (tag: string, isFrozen: boolean) => {
  if (isFrozen) return { row: styles.frozenUtxo, tag: styles.utxoTagFreeze }
  if (tag === 'deposit') return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
  if (tag === 'joined' || tag === 'cj-out') return { row: styles.joinedUtxoAndCjout, tag: styles.utxoTagJoinedAndCjout }
  if (tag === 'non-cj-change' || tag === 'reused')
    return { row: styles.changeAndReuseUtxo, tag: styles.utxoTagChangeAndReuse }
  return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
}

const UtxoRow = memo(
  ({ utxo, utxoIndex, onToggle, isFrozen, showRadioButton, showBackground, settings, walletInfo, t }: UtxoRowProps) => {
    const { address: utxoAddress, confirmations, value, checked, frozen } = utxo

    const address = useMemo(() => formatAddress(utxoAddress), [utxoAddress])
    const conf = useMemo(() => formatConfirmations(confirmations), [confirmations])
    const valueString = useMemo(() => satsToBtc(value).toString(), [value])
    const tag = useMemo(() => utxoTags(utxo, walletInfo, t), [utxo, walletInfo, t])

    const { icon, rowAndTagClass } = useMemo(() => {
      if (tag.length === 0) {
        return { icon: 'Unmixed', rowAndTagClass: { row: styles.depositUtxo, tag: styles.utxoTagDeposit } }
      }
      return { icon: utxoIcon(tag[0].tag, isFrozen), rowAndTagClass: allotClasses(tag[0].tag, isFrozen) }
    }, [tag, isFrozen])

    const ConfirmationCell = () =>
      confirmations > 9999 ? (
        <rb.OverlayTrigger
          popperConfig={{
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, 1],
                },
              },
            ],
          }}
          overlay={(props) => <rb.Tooltip {...props}>{confirmations}</rb.Tooltip>}
        >
          <div>
            <Sprite symbol={conf.symbol} width="28px" height="28px" className="mb-1" />
            {conf.confirmations}
          </div>
        </rb.OverlayTrigger>
      ) : (
        <div>
          <Sprite symbol={conf.symbol} width="28px" height="28px" className="mb-1" />
          {conf.confirmations}
        </div>
      )

    return (
      <Row
        item={utxo}
        className={classNames(rowAndTagClass.row, 'cursor-pointer', {
          'bg-transparent': !showBackground,
        })}
        onClick={() => onToggle && onToggle(utxoIndex, frozen)}
      >
        {showRadioButton && (
          <Cell>
            <input
              id={`check-box-${isFrozen ? 'frozen' : 'unFrozen'}-${utxoIndex}`}
              type="checkbox"
              checked={checked}
              onChange={() => {
                onToggle && onToggle(utxoIndex, isFrozen)
              }}
              className={classNames(isFrozen ? styles.squareFrozenToggleButton : styles.squareToggleButton, {
                [styles.selected]: checked,
              })}
            />
          </Cell>
        )}
        <Cell>
          <Sprite symbol={icon} width="23px" height="23px" />
        </Cell>
        <Cell>{address}</Cell>
        <Cell>
          <ConfirmationCell />
        </Cell>
        <Cell>
          <Balance
            valueString={valueString}
            convertToUnit={settings.unit}
            showBalance={true}
            isColorChange={true}
            frozen={isFrozen}
            frozenSymbol={false}
          />
        </Cell>
        <Cell>
          <div className={classNames(rowAndTagClass.tag, 'd-inline-block')}>{tag.length ? tag[0].tag : ''}</div>
        </Cell>
      </Row>
    )
  },
)

const UtxoListDisplay = ({
  utxos,
  onToggle,
  settings,
  showRadioButton = true,
  showBackground = true,
}: UtxoListDisplayProps) => {
  const { t } = useTranslation()
  const walletInfo = useCurrentWalletInfo()

  //Table theme to manage view
  const TABLE_THEME = {
    Table: `
    font-size: ${showRadioButton ? '1rem' : '0.87rem'};
    --data-table-library_grid-template-columns: ${showRadioButton ? '3.5rem 2.5rem 12rem 2fr 3fr 10rem ' : '2.5rem 10rem 5fr 3fr 7.5rem'};
    @media only screen and (min-width: 768px) {
      --data-table-library_grid-template-columns: ${showRadioButton ? '3.5rem 2.5rem 14rem 5fr 3fr 10rem' : '2.5rem 11rem 5fr 3fr 7.5rem'};
    }
  `,
    BaseCell: `
    padding:${showRadioButton ? '0.5rem' : '0.55rem'} 0.35rem !important;
    margin: 0.15rem 0px !important;
  `,
  }
  const tableTheme = useTheme(TABLE_THEME)

  //Default sort is by date the older ones at the bottom, newer ones at the top.
  utxos.sort((a, b) => a.confirmations - b.confirmations)

  return (
    <div className={classNames(styles.utxoListDisplayHeight, 'overflow-y-auto')}>
      <Table
        className={'bg'}
        data={{ nodes: utxos }}
        theme={tableTheme}
        layout={{ custom: true, horizontalScroll: true }}
      >
        {(utxosList: TableTypes.TableProps<Utxo>) => (
          <Body>
            {walletInfo &&
              utxosList.map((utxo: Utxo, index: number) => {
                return (
                  <UtxoRow
                    key={index}
                    utxo={utxo}
                    utxoIndex={index}
                    onToggle={onToggle}
                    isFrozen={utxo.frozen}
                    showRadioButton={showRadioButton}
                    showBackground={showBackground}
                    settings={settings}
                    walletInfo={walletInfo}
                    t={t}
                  />
                )
              })}
          </Body>
        )}
      </Table>
    </div>
  )
}

const Divider = ({ isState, setIsState, className }: DividerProps) => {
  //Effect for getting back to it's original state when components unMounts
  useEffect(() => {
    return () => {
      setIsState(false)
    }
  }, [setIsState])

  return (
    <rb.Row className={classNames('d-flex justify-content-center', className)}>
      <rb.Col xs={12}>
        <div className={mainStyles.jarsDividerContainer}>
          <hr className={mainStyles.dividerLine} />
          <button className={mainStyles.dividerButton} onClick={() => setIsState(!isState)}>
            <Sprite symbol={isState ? 'caret-up' : 'caret-down'} width="20" height="20" />
          </button>
          <hr className={mainStyles.dividerLine} />
        </div>
      </rb.Col>
    </rb.Row>
  )
}

const ShowUtxos = ({ wallet, show, onHide, index }: ShowUtxosProps) => {
  const [alert, setAlert] = useState<SimpleAlert | undefined>(undefined)
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)
  const [unFrozenUtxos, setUnFrozenUtxos] = useState<UtxoList>([])
  const [frozenUtxos, setFrozenUtxos] = useState<UtxoList>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const settings = useSettings()

  const isHandleReloadExecuted = useRef(false)

  // Load data from wallet info
  const loadData = useCallback(
    (walletInfo: WalletInfo) => {
      const data = Object.entries(walletInfo.utxosByJar).find(([key]) => key === index)
      const utxos: any = data ? data[1] : []

      const frozen = utxos
        .filter((utxo: any) => utxo.frozen)
        .map((utxo: any) => ({ ...utxo, id: utxo.utxo, checked: false }))
      const unfrozen = utxos
        .filter((utxo: any) => !utxo.frozen)
        .map((utxo: any) => ({ ...utxo, id: utxo.utxo, checked: true }))

      setFrozenUtxos(frozen)
      setUnFrozenUtxos(unfrozen)

      if (unfrozen.length === 0) {
        setShowFrozenUtxos(true)
        setAlert({ variant: 'warning', message: t('show_utxos.alert_for_unfreeze_utxos'), dismissible: true })
      } else {
        setAlert(undefined)
      }
    },
    [index, t],
  )

  // Reload wallet info
  const handleReload = useCallback(async () => {
    const abortCtrl = new AbortController()
    try {
      setIsLoading(true)
      const walletInfo = await reloadCurrentWalletInfo.reloadAll({ signal: abortCtrl.signal })
      loadData(walletInfo)
      setIsLoading(false)
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      }
    }
  }, [reloadCurrentWalletInfo, loadData])

  //Effect to Reload walletInfo only once
  useEffect(() => {
    if (!isHandleReloadExecuted.current) {
      handleReload()
      isHandleReloadExecuted.current = true
    }
  }, [handleReload])

  //Effect to set Alert according to the walletInfo
  useEffect(() => {
    const frozenUtxosToUpdate = frozenUtxos.filter((utxo: Utxo) => utxo.checked && !utxo.locktime)
    const timeLockedUtxo = frozenUtxos.find((utxo: Utxo) => utxo.checked && utxo.locktime)
    const allUnfrozenUnchecked = unFrozenUtxos.every((utxo: Utxo) => !utxo.checked)

    if (timeLockedUtxo) {
      setAlert({ variant: 'danger', message: `${t('show_utxos.alert_for_time_locked')} ${timeLockedUtxo.locktime}` })
    } else if (allUnfrozenUnchecked && frozenUtxosToUpdate.length === 0) {
      setAlert({ variant: 'warning', message: t('show_utxos.alert_for_unfreeze_utxos'), dismissible: true })
    } else if (unFrozenUtxos.length !== 0 || frozenUtxosToUpdate.length !== 0) {
      setAlert(undefined)
    }
  }, [frozenUtxos, unFrozenUtxos, t])

  // Handler to toggle UTXO selection
  const handleToggle = useCallback((utxoIndex: number, isFrozen: boolean) => {
    if (!isFrozen) {
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
      title={t('show_utxos.show_utxo_title')}
      size="lg"
      showCloseButton={true}
      removeClassName={true}
      confirmVariant={'dark'}
    >
      {!isLoading ? (
        <>
          <div className={classNames(styles.subTitle, 'm-3 mb-4 text-start')}>
            {unFrozenUtxos.length !== 0
              ? t('show_utxos.show_utxo_subtitle')
              : t('show_utxos.show_utxo_subtitle_when_allutxos_are_frozen')}
          </div>
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
          <UtxoListDisplay
            utxos={unFrozenUtxos}
            onToggle={handleToggle}
            settings={settings}
            showRadioButton={true}
            showBackground={true}
          />
          {frozenUtxos.length > 0 && unFrozenUtxos.length > 0 && (
            <Divider
              isState={showFrozenUtxos}
              setIsState={setShowFrozenUtxos}
              className={`mt-4 ${showFrozenUtxos && 'mb-4'}`}
            />
          )}
          {showFrozenUtxos && (
            <UtxoListDisplay
              utxos={frozenUtxos}
              onToggle={handleToggle}
              settings={settings}
              showRadioButton={true}
              showBackground={true}
            />
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

export { ShowUtxos, Divider, UtxoListDisplay, UtxoRow }
