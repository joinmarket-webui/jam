import { useMemo } from 'react'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { usePagination } from '@table-library/react-table-library/pagination'
import { useRowSelect, HeaderCellSelect, CellSelect, SelectTypes } from '@table-library/react-table-library/select'
import { useSort, HeaderCellSort, SortToggleType } from '@table-library/react-table-library/sort'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { State } from '@table-library/react-table-library/types/common'
import { useTheme } from '@table-library/react-table-library/theme'
import { useSettings } from '../../context/SettingsContext'
import { Utxo, WalletInfo } from '../../context/WalletContext'
import * as fb from '../fb/utils'
import { shortenStringMiddle } from '../../utils'
import Sprite from '../Sprite'
import Balance from '../Balance'
import TablePagination from '../TablePagination'
import styles from './UtxoList.module.css'

const withTooltip = ({ node, tooltip }: { node: React.ReactElement; tooltip: React.ReactElement }) => {
  return (
    <rb.OverlayTrigger overlay={(props) => <rb.Tooltip {...props}>{tooltip}</rb.Tooltip>}>{node}</rb.OverlayTrigger>
  )
}

const ADDRESS_STATUS_COLORS: { [key: string]: string } = {
  new: 'normal',
  used: 'normal',
  reused: 'danger',
  'cj-out': 'success',
  'change-out': 'warning',
  'non-cj-change': 'normal',
  deposit: 'normal',
}

type Tag = { tag: string; color: string }

const utxoTags = (utxo: Utxo, walletInfo: WalletInfo, t: TFunction<'translation', undefined>): Tag[] => {
  const rawStatus = walletInfo.addressSummary[utxo.address]?.status

  let status: string | null = null

  // If a UTXO is locked, it's `status` will be the locktime, with other states
  // appended in brackets, e.g. `2099-12-01 [LOCKED] [FROZEN]`
  if (rawStatus && !utxo.locktime) {
    const indexOfOtherTag = rawStatus.indexOf('[')

    if (indexOfOtherTag !== -1) {
      status = rawStatus.substring(0, indexOfOtherTag).trim()
    } else {
      status = rawStatus
    }
  }

  const tags: Tag[] = []

  if (utxo.label) tags.push({ tag: utxo.label, color: 'normal' })
  if (status) tags.push({ tag: status, color: ADDRESS_STATUS_COLORS[status] || 'normal' })
  if (fb.utxo.isLocked(utxo) && utxo.locktime)
    tags.push({ tag: t('jar_details.utxo_list.utxo_tag_locked'), color: 'normal' })
  return tags
}

const utxoIcon = (utxo: Utxo, t: TFunction<'translation', undefined>) => {
  if (fb.utxo.isFidelityBond(utxo)) {
    return (
      <>
        {withTooltip({
          node: (
            <div className={styles.utxoIcon}>
              <Sprite className={styles.iconLocked} symbol="timelock" width="20" height="20" />
            </div>
          ),
          tooltip: <div>{t('jar_details.utxo_list.utxo_tooltip_locktime', { locktime: utxo.locktime })}</div>,
        })}
      </>
    )
  } else if (utxo.frozen) {
    return (
      <div className={styles.utxoIcon}>
        <Sprite className={styles.iconFrozen} symbol="snowflake" width="20" height="20" />
      </div>
    )
  }
  return <></>
}

const utxoConfirmations = (utxo: Utxo) => {
  const symbol = `confs-${utxo.confirmations >= 6 ? 'full' : utxo.confirmations}`

  return (
    <div className={classNames(styles.utxoConfirmations, styles[`utxoConfirmations-${utxo.confirmations}`])}>
      <Sprite symbol={symbol} width="20" height="20" />
      <div>{utxo.confirmations}</div>
    </div>
  )
}

const SORT_KEYS = {
  frozenOrLocked: 'FROZEN_OR_LOCKED',
  value: 'VALUE',
  confirmations: 'CONFIRMATIONS',
  tags: 'TAGS',
}

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 2rem 3.5rem 2.5rem 2fr 3fr 6rem 3fr 1fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    padding: 0.25rem 0.25rem !important;
    &:nth-of-type(1) {
      text-align: center;
    }
    &:nth-of-type(3) {
      text-align: center;
    }
    &:nth-of-type(4) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(6) button {
      display: flex;
      justify-content: center;
    }
  `,
  Cell: `
    &:nth-of-type(2) {
      text-align: center;
    }
    &:nth-of-type(4) {
      text-align: right;
    }
    &:nth-of-type(6) > div {
      display: flex;
      justify-content: center;
    }
  `,
  Row: `
    &.row-select-selected {
      color: inherit;
      font-weight: inherit;
    }
  `,
}

const toUtxo = (tableNode: TableTypes.TableNode): Utxo => {
  const { id, _icon, _tags, _confs, ...utxo } = tableNode

  return utxo as Utxo
}

interface UtxoListProps {
  utxos: Array<Utxo>
  walletInfo: WalletInfo
  selectState: State
  setSelectedUtxoIds: (selectedUtxoIds: Array<string>) => void
  setDetailUtxo: (utxo: Utxo) => void
  toggleFreezeState: (utxo: Utxo) => Promise<void>
}

const UtxoList = ({
  utxos,
  walletInfo,
  selectState,
  setSelectedUtxoIds,
  setDetailUtxo,
  toggleFreezeState,
}: UtxoListProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const tableData: TableTypes.Data = useMemo(
    () => ({
      nodes: utxos.map((utxo: Utxo) => ({
        ...utxo,
        id: utxo.utxo,
        _icon: utxoIcon(utxo, t),
        _tags: utxoTags(utxo, walletInfo, t),
        _confs: utxoConfirmations(utxo),
      })),
    }),
    [utxos, walletInfo, t]
  )

  const tableTheme = useTheme(TABLE_THEME)
  const pagination = usePagination(tableData, {
    state: {
      page: 0,
      size: 25,
    },
  })

  const onTableSelectChange = (action: any, state: State) => {
    setSelectedUtxoIds(state.ids)
  }

  const tableSelect = useRowSelect(
    tableData,
    {
      state: selectState,
      onChange: onTableSelectChange,
    },
    {
      rowSelect: SelectTypes.MultiSelect,
      buttonSelect: SelectTypes.MultiSelect,
    }
  )

  const tableSort = useSort(
    tableData,
    {
      state: {
        sortKey: SORT_KEYS.value,
        reverse: true,
      },
    },
    {
      sortIcon: {
        margin: '4px',
        iconDefault: <Sprite symbol="caret-right" width="20" height="20" />,
        iconUp: <Sprite symbol="caret-up" width="20" height="20" />,
        iconDown: <Sprite symbol="caret-down" width="20" height="20" />,
      },
      sortToggleType: SortToggleType.AlternateWithReset,
      sortFns: {
        [SORT_KEYS.frozenOrLocked]: (array) =>
          array.sort((a, b) => {
            const aUtxo = toUtxo(a)
            const bUtxo = toUtxo(b)
            const aLocked = fb.utxo.isLocked(aUtxo)
            const bLocked = fb.utxo.isLocked(bUtxo)

            if (aLocked && !bLocked) return -1
            if (!aLocked && bLocked) return 1
            if (aLocked && bLocked) return aUtxo.value - bUtxo.value
            if (aUtxo.frozen && !bUtxo.frozen) return -1
            if (!aUtxo.frozen && bUtxo.frozen) return 1
            if (aUtxo.frozen && bUtxo.frozen) return aUtxo.value - bUtxo.value
            return 0
          }),
        [SORT_KEYS.value]: (array) => array.sort((a, b) => a.value - b.value),
        [SORT_KEYS.confirmations]: (array) => array.sort((a, b) => a.confirmations - b.confirmations),
        [SORT_KEYS.tags]: (array) =>
          array.sort((a, b) => (String(a._tags[0]?.tag) || 'z').localeCompare(String(b._tags[0]?.tag) || 'z')),
      },
    }
  )

  return (
    <div className={styles.utxoList}>
      <Table
        data={tableData}
        theme={tableTheme}
        pagination={pagination}
        select={tableSelect}
        sort={tableSort}
        layout={{ custom: true, horizontalScroll: true }}
      >
        {(tableList) => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCellSelect />
                <HeaderCellSort sortKey={SORT_KEYS.frozenOrLocked}>
                  <Sprite symbol="coins" width="20" height="20" className={styles.headerCoinsIcon} />
                </HeaderCellSort>
                <HeaderCell></HeaderCell>
                <HeaderCellSort sortKey={SORT_KEYS.value}>
                  {t('jar_details.utxo_list.column_title_balance')}
                </HeaderCellSort>
                <HeaderCell>{t('jar_details.utxo_list.column_title_address')}</HeaderCell>
                <HeaderCellSort sortKey={SORT_KEYS.confirmations}>
                  {t('jar_details.utxo_list.column_title_confirmations')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.tags}>
                  {t('jar_details.utxo_list.column_title_label_and_status')}
                </HeaderCellSort>
                <HeaderCell></HeaderCell>
              </HeaderRow>
            </Header>
            <Body>
              {tableList.map((item) => {
                const utxo = toUtxo(item)
                return (
                  <Row
                    key={item.id}
                    item={item}
                    className={classNames({
                      [styles.frozen]: utxo.frozen,
                      [styles.locked]: fb.utxo.isLocked(utxo),
                    })}
                  >
                    <CellSelect item={item} />
                    <Cell>{item._icon}</Cell>
                    <Cell
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFreezeState(utxo)
                      }}
                    >
                      <span className={styles.quickFreezeUnfreezeBtn}>
                        <Sprite symbol="snowflake" width="20" height="20" />
                      </span>
                    </Cell>
                    <Cell>
                      <Balance
                        valueString={utxo.value.toString()}
                        convertToUnit={settings.unit}
                        showBalance={settings.showBalance}
                      />
                    </Cell>
                    <Cell>
                      <div className="d-block d-lg-none">
                        {withTooltip({
                          node: <code>{shortenStringMiddle(utxo.address, 16)}</code>,
                          tooltip: <div className="break-word">{utxo.address}</div>,
                        })}
                      </div>
                      <div className="d-none d-lg-block d-xl-none">
                        {withTooltip({
                          node: <code>{shortenStringMiddle(utxo.address, 32)}</code>,
                          tooltip: <div className="break-word">{utxo.address}</div>,
                        })}
                      </div>
                      <div className="d-none d-xl-block">
                        <code>{utxo.address}</code>
                      </div>
                    </Cell>
                    <Cell>{item._confs}</Cell>
                    <Cell>
                      <div className={styles.utxoTagList}>
                        {item._tags.map((tag: Tag, index: number) => (
                          <div key={index} className={classNames(styles.utxoTag, styles[`utxoTag-${tag.color}`])}>
                            {tag.tag}
                          </div>
                        ))}
                      </div>
                    </Cell>
                    <Cell>
                      <rb.Button
                        className={styles.utxoListButtonDetails}
                        variant="link"
                        onClick={() => setDetailUtxo(utxo)}
                      >
                        {t('jar_details.utxo_list.row_button_details')}
                      </rb.Button>
                    </Cell>
                  </Row>
                )
              })}
            </Body>
          </>
        )}
      </Table>
      <div className="mt-4 mb-4 mb-lg-0">
        <TablePagination data={tableData} pagination={pagination} />
      </div>
    </div>
  )
}

export { UtxoList }
