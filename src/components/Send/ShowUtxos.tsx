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

// Utility function to allot classes
const allotClasses = (tag: string, isFrozen: boolean) => {
  if (isFrozen) return { row: styles.frozenUtxo, tag: styles.utxoTagFreeze }
  if (tag === 'deposit') return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
  if (tag === 'joined' || tag === 'cj-out') return { row: styles.joinedUtxoAndCjout, tag: styles.utxoTagJoinedAndCjout }
  if (tag === 'non-cj-change' || tag === 'reused')
    return { row: styles.changeAndReuseUtxo, tag: styles.utxoTagChangeAndReuse }
  return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
}

const UtxoRow = ({ utxo, onToggle, showBackgroundColor, settings, walletInfo, t }: UtxoRowProps) => {
  const address = useMemo(() => shortenStringMiddle(utxo.address, 24), [utxo.address])
  const tag = useMemo(() => utxoTags(utxo, walletInfo, t), [utxo, walletInfo, t])

  const rowAndTagClass = useMemo(() => {
    if (tag.length === 0) {
      return { row: styles.depositUtxo, tag: styles.utxoTagDeposit }
    }
    return allotClasses(tag[0].value, utxo.frozen)
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
        <UtxoIcon value={utxo} tags={tag} />
      </Cell>
      <Cell className="slashed-zeroes">{address}</Cell>
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
        {tag.length > 0 && (
          <div className={classNames(rowAndTagClass.tag, 'd-inline-block')}>{tag[0].displayValue}</div>
        )}
      </Cell>
    </Row>
  )
}

type SelectableUtxoTableRowData = SelectableUtxo & {
  // TODO: add "tags" here and remove from "Utxo" type
  // tags?: { tag: string; color: string }[]
} & Pick<TableTypes.TableNode, 'id'>

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
