import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import classNames from 'classnames'
import { Table, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { WalletInfo, Utxo, useCurrentWalletInfo } from '../../context/WalletContext'
import { useSettings, Settings } from '../../context/SettingsContext'
import Alert from '../Alert'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import Sprite from '../Sprite'
import { utxoTags } from '../jar_details/UtxoList'
import { UtxoList } from './SourceJarSelector'
import { shortenStringMiddle } from '../../utils'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'

interface ShowUtxosProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  alert: SimpleAlert | undefined
  isLoading: boolean
  frozenUtxos: UtxoList
  unFrozenUtxos: UtxoList
  setFrozenUtxos: (arg: UtxoList) => void
  setUnFrozenUtxos: (arg: UtxoList) => void
}

interface UtxoRowProps {
  utxo: Utxo
  utxoIndex: number
  onToggle?: (index: number, isFrozen: boolean) => void
  isFrozen: boolean
  settings: Settings
  showRadioButton: boolean
  showBackgroundColor: boolean
  walletInfo: WalletInfo
  t: TFunction
}

interface UtxoListDisplayProps {
  utxos: Array<Utxo>
  onToggle?: (index: number, isFrozen: boolean) => void
  settings: Settings
  showRadioButton: boolean
  showBackgroundColor: boolean
}

interface DividerProps {
  isState: boolean
  setIsState: (arg: boolean) => void
  className?: string
}

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
  if (tag === 'bond') return 'timelock'
  if (tag === 'cj-out') return 'mixed'
  if (tag === 'deposit' || tag === 'non-cj-change' || tag === 'reused') return 'unmixed'
  return 'unmixed' // fallback
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
  ({
    utxo,
    utxoIndex,
    onToggle,
    isFrozen,
    showRadioButton,
    showBackgroundColor,
    settings,
    walletInfo,
    t,
  }: UtxoRowProps) => {
    const { address: utxoAddress, confirmations, value, checked, frozen } = utxo

    const address = useMemo(() => shortenStringMiddle(utxoAddress, 16), [utxoAddress])
    const conf = useMemo(() => formatConfirmations(confirmations), [confirmations])
    const valueString = useMemo(() => satsToBtc(value).toString(), [value])
    const tag = useMemo(() => utxoTags(utxo, walletInfo, t), [utxo, walletInfo, t])

    const { icon, rowAndTagClass } = useMemo(() => {
      if (tag.length === 0) {
        return { icon: 'unmixed', rowAndTagClass: { row: styles.depositUtxo, tag: styles.utxoTagDeposit } }
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
          'bg-transparent': !showBackgroundColor,
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
            colored={false}
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
  showBackgroundColor = true,
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
                    showBackgroundColor={showBackgroundColor}
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

const ShowUtxos = ({
  isOpen,
  onCancel,
  onConfirm,
  alert,
  isLoading,
  frozenUtxos,
  unFrozenUtxos,
  setFrozenUtxos,
  setUnFrozenUtxos,
}: ShowUtxosProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const [showFrozenUtxos, setShowFrozenUtxos] = useState<boolean>(false)

  // Handler to toggle UTXO selection
  const handleUtxoCheckedState = useCallback(
    (utxoIndex: number, isFrozen: boolean) => {
      if (!isFrozen) {
        const utxos = unFrozenUtxos.map((utxo: Utxo, i: number) =>
          i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo,
        )
        setUnFrozenUtxos(utxos)
      } else {
        const utxos = frozenUtxos.map((utxo: Utxo, i: number) =>
          i === utxoIndex ? { ...utxo, checked: !utxo.checked } : utxo,
        )
        setFrozenUtxos(utxos)
      }
    },
    [frozenUtxos, unFrozenUtxos, setUnFrozenUtxos, setFrozenUtxos],
  )

  //Effect to hide the Divider line when there is no unFrozen-UTXOs present
  useEffect(() => {
    if (unFrozenUtxos.length === 0 && frozenUtxos.length > 0) {
      setShowFrozenUtxos(true)
    }
  }, [unFrozenUtxos.length, frozenUtxos.length])

  return (
    <ConfirmModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      disabled={alert?.dismissible || isLoading}
      isShown={isOpen}
      title={t('show_utxos.show_utxo_title')}
      size="lg"
      showCloseButton={true}
      confirmVariant={'dark'}
      headerClassName={styles.customHeaderClass}
      titleClassName={styles.customTitleClass}
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
              <Alert variant={alert.variant} message={alert.message} dismissible={!alert.dismissible} />
            </rb.Row>
          )}
          <UtxoListDisplay
            utxos={unFrozenUtxos}
            onToggle={handleUtxoCheckedState}
            settings={settings}
            showRadioButton={true}
            showBackgroundColor={true}
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
              onToggle={handleUtxoCheckedState}
              settings={settings}
              showRadioButton={true}
              showBackgroundColor={true}
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
