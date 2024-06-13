import { useState, useMemo } from 'react'
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
import Divider from '../Divider'
import { BaseModal } from '../Modal'
import Sprite from '../Sprite'
import { utxoTags } from '../utxo/utils'
import { UtxoConfirmations } from '../utxo/Confirmations'
import UtxoIcon from '../utxo/UtxoIcon'
import UtxoTags from '../utxo/UtxoTags'
import { shortenStringMiddle } from '../../utils'
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
  utxo: SelectableUtxoTableRowData
  onToggle: (utxo: SelectableUtxoTableRowData) => void
  settings: Settings
  showBackgroundColor: boolean
  walletInfo: WalletInfo
  t: TFunction
}

interface UtxoListDisplayProps {
  utxos: SelectableUtxo[]
  onToggle: (utxo: SelectableUtxo) => void
  settings: Settings
  showBackgroundColor: boolean
}

const UtxoRow = ({ utxo, onToggle, showBackgroundColor, settings, walletInfo, t }: UtxoRowProps) => {
  const displayAddress = useMemo(() => shortenStringMiddle(utxo.address, 24), [utxo.address])
  const tags = useMemo(() => utxoTags(utxo, walletInfo, t), [utxo, walletInfo, t])

  return (
    <Row
      item={utxo}
      className={classNames(styles.row, styles[`row-${tags[0].color || 'normal'}`], {
        [styles['row-frozen']]: utxo.frozen,
        'bg-transparent': !showBackgroundColor,
        'cursor-pointer': utxo.selectable,
        'cursor-not-allowed': !utxo.selectable,
      })}
      onClick={() => utxo.selectable && onToggle(utxo)}
    >
      <Cell>
        {utxo.selectable && (
          <div className="d-flex justify-content-center align-items-center">
            <input
              id={`utxo-checkbox-${utxo.utxo}`}
              type="checkbox"
              checked={utxo.checked}
              disabled={!utxo.selectable}
              onChange={() => utxo.selectable && onToggle(utxo)}
              className={styles.checkbox}
            />
          </div>
        )}
      </Cell>
      <Cell>
        <UtxoIcon value={utxo} tags={tags} />
      </Cell>
      <Cell className="slashed-zeroes">
        <rb.OverlayTrigger
          overlay={(props) => (
            <rb.Tooltip className="slashed-zeroes" {...props}>
              {utxo.address}
            </rb.Tooltip>
          )}
        >
          <span>{displayAddress}</span>
        </rb.OverlayTrigger>
      </Cell>
      <Cell>
        <UtxoConfirmations value={utxo} />
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
        <UtxoTags value={tags} />
      </Cell>
    </Row>
  )
})

type SelectableUtxoTableRowData = SelectableUtxo & Pick<TableTypes.TableNode, 'id'>

const UtxoListDisplay = ({ utxos, onToggle, settings, showBackgroundColor = true }: UtxoListDisplayProps) => {
  const { t } = useTranslation()
  const walletInfo = useCurrentWalletInfo()

  const TABLE_THEME = {
    Table: `
    --data-table-library_grid-template-columns: 2.5rem 2.5rem 17rem 3rem 12rem 1fr};
  `,
    BaseCell: `
    padding: 0.35rem 0.25rem !important;
    margin: 0.15rem 0px !important;
  `,
    Cell: `
    &:nth-of-type(5) {
      text-align: right;
    }
  `,
  }
  const tableTheme = useTheme(TABLE_THEME)

  const tableData: TableTypes.Data<SelectableUtxoTableRowData> = useMemo(
    () => ({
      nodes: utxos.map(
        (utxo: Utxo) =>
          ({
            ...utxo,
            id: utxo.utxo,
          }) as SelectableUtxoTableRowData,
      ),
    }),
    [utxos],
  )

  return (
    <div className={classNames(styles.utxoListDisplayHeight, 'overflow-y-auto')}>
      <Table className="bg" data={tableData} theme={tableTheme} layout={{ custom: true, horizontalScroll: true }}>
        {(utxosList: TableTypes.TableProps<SelectableUtxoTableRowData>) => (
          <Body>
            {walletInfo &&
              utxosList.map((utxo: SelectableUtxoTableRowData, index: number) => {
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

type SelectableUtxo = Utxo & { checked: boolean; selectable: boolean }

// TODO: rename to QuickFreezeUtxosModal?
const ShowUtxos = ({ isOpen, onCancel, onConfirm, isLoading, utxos, alert }: ShowUtxosProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

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
  const [showFrozenUtxos, setShowFrozenUtxos] = useState(upperUtxos.length === 0 && lowerUtxos.length > 0)

  return (
    <BaseModal
      isShown={isOpen}
      onCancel={onCancel}
      backdrop={true}
      title={t('show_utxos.show_utxo_title')}
      closeButton
      headerClassName=""
      titleClassName=""
    >
      <rb.Modal.Body>
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center mt-5 mb-5">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <div>{t('earn.fidelity_bond.text_loading')}</div>
          </div>
        ) : (
          <>
            <rb.Row className="text-secondary px-3 mb-2">
              {upperUtxos.length > 0
                ? t('show_utxos.show_utxo_subtitle')
                : t('show_utxos.show_utxo_subtitle_when_allutxos_are_frozen')}
            </rb.Row>
            {alert && (
              <rb.Row>
                <Alert variant={alert.variant} message={alert.message} />
              </rb.Row>
            )}
            <rb.Row>
              <UtxoListDisplay
                utxos={upperUtxos}
                onToggle={(utxo) => {
                  setUpperUtxos((current) =>
                    current.map((it) => (it.utxo !== utxo.utxo ? it : { ...it, checked: !utxo.checked })),
                  )
                }}
                settings={settings}
                showBackgroundColor={true}
              />
            </rb.Row>
            {upperUtxos.length > 0 && lowerUtxos.length > 0 && (
              <Divider
                toggled={showFrozenUtxos}
                onToggle={() => setShowFrozenUtxos((current) => !current)}
                className={`mt-4 ${showFrozenUtxos && 'mb-4'}`}
              />
            )}
            <rb.Collapse in={showFrozenUtxos}>
              <rb.Row className="">
                <UtxoListDisplay
                  utxos={lowerUtxos}
                  onToggle={(utxo) => {
                    setLowerUtxos((current) =>
                      current.map((it) => (it.utxo !== utxo.utxo ? it : { ...it, checked: !utxo.checked })),
                    )
                  }}
                  settings={settings}
                  showBackgroundColor={true}
                />
              </rb.Row>
            </rb.Collapse>
          </>
        )}
      </rb.Modal.Body>
      <rb.Modal.Footer className="d-flex justify-content-center align-items-center gap-1">
        <rb.Button
          variant="light"
          onClick={() => onCancel()}
          className="d-flex flex-1 justify-content-center align-items-center"
        >
          <Sprite symbol="cancel" width="26" height="26" />
          <div>{t('modal.confirm_button_reject')}</div>
        </rb.Button>
        <rb.Button
          variant="dark"
          onClick={() => onConfirm(selectedUtxos)}
          disabled={isLoading}
          className="d-flex flex-1 justify-content-center align-items-center"
        >
          {t('modal.confirm_button_accept')}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export { ShowUtxos }
