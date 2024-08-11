import { useState, useEffect, memo, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import classNames from 'classnames'
import { Table, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { WalletInfo, Utxo, useCurrentWalletInfo, Utxos } from '../../context/WalletContext'
import { useSettings, Settings } from '../../context/SettingsContext'
import Alert from '../Alert'
import Balance from '../Balance'
import { ConfirmModal } from '../Modal'
import Sprite from '../Sprite'
import { utxoTags } from '../jar_details/UtxoList'
import { shortenStringMiddle } from '../../utils'
import mainStyles from '../MainWalletView.module.css'
import styles from './ShowUtxos.module.css'

interface ShowUtxosProps {
  isOpen: boolean
  isLoading: boolean
  utxos: Utxos
  alert?: SimpleAlert
  onCancel: () => void
  onConfirm: (selectedUtxos: Utxos) => void
}

interface UtxoRowProps {
  utxo: SelectableUtxo
  onToggle: (utxo: SelectableUtxo) => void
  settings: Settings
  showBackgroundColor: boolean
  walletInfo: WalletInfo
  t: TFunction
}

interface UtxoListDisplayProps {
  utxos: SelectableUtxo[]
  onToggle: (utxo: SelectableUtxo) => void
  settings: Settings
  showRadioButton: boolean
  showBackgroundColor: boolean
}

interface DividerProps {
  isState: boolean
  setIsState: (arg: boolean) => void
  className?: string
}

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

interface ConfirmationFormat {
  symbol: string
  display: string
  confirmations: number
}

const formatConfirmations = (confirmations: number): ConfirmationFormat => ({
  symbol: `confs-${confirmations >= 6 ? 'full' : confirmations}`,
  display: confirmations > 9999 ? `${Number(9999).toLocaleString()}+` : confirmations.toLocaleString(),
  confirmations,
})

const Confirmations = ({ value }: { value: ConfirmationFormat }) =>
  value.confirmations > 9999 ? (
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
      overlay={(props) => <rb.Tooltip {...props}>{value.confirmations.toLocaleString()}</rb.Tooltip>}
    >
      <div>
        <Sprite symbol={value.symbol} width="28px" height="28px" className="mb-1" />
        {value.display}
      </div>
    </rb.OverlayTrigger>
  ) : (
    <div>
      <Sprite symbol={value.symbol} width="28px" height="28px" className="mb-1" />
      {value.display}
    </div>
  )

const UtxoRow = memo(({ utxo, onToggle, showBackgroundColor, settings, walletInfo, t }: UtxoRowProps) => {
  const address = useMemo(() => shortenStringMiddle(utxo.address, 16), [utxo.address])
  const confFormat = useMemo(() => formatConfirmations(utxo.confirmations), [utxo.confirmations])
  const tag = useMemo(() => utxoTags(utxo, walletInfo, t), [utxo, walletInfo, t])

  const { icon, rowAndTagClass } = useMemo(() => {
    if (tag.length === 0) {
      return { icon: 'unmixed', rowAndTagClass: { row: styles.depositUtxo, tag: styles.utxoTagDeposit } }
    }
    return { icon: utxoIcon(tag[0].tag, utxo.frozen), rowAndTagClass: allotClasses(tag[0].tag, utxo.frozen) }
  }, [tag, utxo.frozen])

  return (
    <Row
      item={utxo}
      className={classNames(rowAndTagClass.row, {
        'bg-transparent': !showBackgroundColor,
        'cursor-pointer': utxo.selectable,
        'cursor-not-allowed': !utxo.selectable,
      })}
      onClick={() => utxo.selectable && onToggle(utxo)}
    >
      <Cell>
        {utxo.selectable && (
          <input
            id={`utxo-checkbox-${utxo.utxo}`}
            type="checkbox"
            checked={utxo.checked}
            disabled={!utxo.selectable}
            onChange={() => utxo.selectable && onToggle(utxo)}
            className={classNames(utxo.frozen ? styles.squareFrozenToggleButton : styles.squareToggleButton, {
              [styles.selected]: utxo.checked,
            })}
          />
        )}
      </Cell>
      <Cell>
        <Sprite symbol={icon} width="23px" height="23px" />
      </Cell>
      <Cell className="slashed-zeroes">{address}</Cell>
      <Cell>
        <Confirmations value={confFormat} />
      </Cell>
      <Cell>
        <Balance
          valueString={String(utxo.value)}
          convertToUnit={settings.unit}
          showBalance={true}
          colored={false}
          frozen={utxo.frozen}
          frozenSymbol={false}
        />
      </Cell>
      <Cell>
        <div className={classNames(rowAndTagClass.tag, 'd-inline-block')}>{tag.length ? tag[0].tag : ''}</div>
      </Cell>
    </Row>
  )
})

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

  return (
    <div className={classNames(styles.utxoListDisplayHeight, 'overflow-y-auto')}>
      <Table
        className="bg"
        data={{ nodes: utxos }}
        theme={tableTheme}
        layout={{ custom: true, horizontalScroll: true }}
      >
        {(utxosList: TableTypes.TableProps<SelectableUtxo>) => (
          <Body>
            {walletInfo &&
              utxosList.map((utxo: SelectableUtxo, index: number) => {
                return (
                  <UtxoRow
                    key={index}
                    utxo={utxo}
                    onToggle={onToggle}
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

type SelectableUtxo = Utxo & { checked: boolean; selectable: boolean }

const ShowUtxos = ({ isOpen, onCancel, onConfirm, isLoading, utxos, alert }: ShowUtxosProps) => {
  const { t } = useTranslation()
  const settings = useSettings()
  const [showFrozenUtxos, setShowFrozenUtxos] = useState(false)

  const [upperUtxos, setUpperUtxos] = useState<SelectableUtxo[]>(
    utxos
      .filter((it) => !it.frozen)
      .filter((it) => !it.locktime)
      .map((it) => ({ ...it, checked: true, selectable: true }))
      .sort((a, b) => a.confirmations - b.confirmations),
  )
  const [lowerUtxos, setLowerUtxos] = useState<SelectableUtxo[]>(() => {
    const frozenNonTimelockedUtxos = utxos
      .filter((it) => it.frozen)
      .filter((it) => !it.locktime)
      .map((it) => ({ ...it, checked: false, selectable: true }))
      .sort((a, b) => a.confirmations - b.confirmations)

    const timelockedUtxos = utxos
      .filter((it) => it.locktime !== undefined)
      .map((it) => ({ ...it, checked: false, selectable: false }))
      .sort((a, b) => a.confirmations - b.confirmations)

    return [...frozenNonTimelockedUtxos, ...timelockedUtxos]
  })

  const selectedUtxos = useMemo(
    () => [...upperUtxos, ...lowerUtxos].filter((it) => it.checked),
    [upperUtxos, lowerUtxos],
  )

  //Effect to hide the Divider line when there is no unFrozen-UTXOs present
  useEffect(() => {
    if (upperUtxos.length === 0 && lowerUtxos.length > 0) {
      setShowFrozenUtxos(true)
    }
  }, [upperUtxos.length, lowerUtxos.length])

  return (
    <ConfirmModal
      onCancel={onCancel}
      onConfirm={() => onConfirm(selectedUtxos)}
      disabled={isLoading}
      isShown={isOpen}
      title={t('show_utxos.show_utxo_title')}
      size="lg"
      showCloseButton={true}
      confirmVariant="dark"
      headerClassName={styles.customHeaderClass}
      titleClassName={styles.customTitleClass}
    >
      {!isLoading ? (
        <>
          <div className={classNames(styles.subTitle, 'm-3 mb-4 text-start')}>
            {upperUtxos.length !== 0
              ? t('show_utxos.show_utxo_subtitle')
              : t('show_utxos.show_utxo_subtitle_when_allutxos_are_frozen')}
          </div>
          {alert && (
            <rb.Row>
              <Alert variant={alert.variant} message={alert.message} />
            </rb.Row>
          )}
          <UtxoListDisplay
            utxos={upperUtxos}
            onToggle={(utxo) => {
              setUpperUtxos((current) =>
                current.map((it) => (it.utxo !== utxo.utxo ? it : { ...it, checked: !utxo.checked })),
              )
            }}
            settings={settings}
            showRadioButton={true}
            showBackgroundColor={true}
          />
          {upperUtxos.length > 0 && lowerUtxos.length > 0 && (
            <Divider
              isState={showFrozenUtxos}
              setIsState={setShowFrozenUtxos}
              className={`mt-4 ${showFrozenUtxos && 'mb-4'}`}
            />
          )}
          {showFrozenUtxos && (
            <UtxoListDisplay
              utxos={lowerUtxos}
              onToggle={(utxo) => {
                setLowerUtxos((current) =>
                  current.map((it) => (it.utxo !== utxo.utxo ? it : { ...it, checked: !utxo.checked })),
                )
              }}
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
