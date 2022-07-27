import React, { useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import classnames from 'classnames'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useRowSelect, HeaderCellSelect, CellSelect, SelectTypes } from '@table-library/react-table-library/select'
import { useSort, HeaderCellSort } from '@table-library/react-table-library/sort'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { useTheme } from '@table-library/react-table-library/theme'
import { useSettings } from '../../context/SettingsContext'
import { Utxo, WalletInfo } from '../../context/WalletContext'
import * as fb from '../fb/utils'
import Sprite from '../Sprite'
import Balance from '../Balance'
import styles from './UtxoList.module.css'

const cx = classnames.bind(styles)

const ADDRESS_STATUS_COLORS: { [key: string]: string } = {
  new: 'normal',
  used: 'normal',
  reused: 'danger',
  'cj-out': 'success',
  'change-out': 'warning',
  'non-cj-change': 'normal',
  deposit: 'normal',
}

const SORT_KEYS = {
  frozenOrLocked: 'FROZEN_OR_LOCKED',
  value: 'VALUE',
}

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 2rem 3.5rem 2fr 4fr 3fr 1fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    &:nth-of-type(1) {
      text-align: center;
    }
  `,
  Cell: `
    &:nth-of-type(2) {
      text-align: center;
    }
  `,
  Row: `
    &.row-select-selected {
      color: inherit;
      font-weight: inherit;
    }
  `,
}

interface UtxoListProps {
  utxos: Array<Utxo>
  walletInfo: WalletInfo
  setSelectedUtxoIds: (selectedUtxoIds: Array<string>) => void
  setDetailUtxo: (utxo: Utxo) => void
}

const UtxoList = ({ utxos, walletInfo, setSelectedUtxoIds, setDetailUtxo }: UtxoListProps) => {
  const settings = useSettings()

  const toUtxo = (tableNode: TableTypes.TableNode): Utxo => {
    const { id, ...utxo } = tableNode

    return utxo as Utxo
  }

  const utxoTags = (utxo: Utxo, walletInfo: WalletInfo) => {
    var rawStatus = walletInfo.addressSummary[utxo.address]?.status

    var status: string | null = null
    var locktime: string | null = null

    if (rawStatus) {
      const indexOfLockedTag = rawStatus.indexOf('[LOCKED]')

      if (indexOfLockedTag !== -1) {
        locktime = rawStatus.substring(0, indexOfLockedTag).trim()
      } else {
        const indexOfOtherTag = rawStatus.indexOf('[')

        if (indexOfOtherTag !== -1) {
          status = rawStatus.substring(0, indexOfOtherTag).trim()
        } else {
          status = rawStatus
        }
      }
    }

    let tags = []

    if (utxo.frozen) tags.push({ tag: 'frozen', color: 'normal' })
    if (utxo.label) tags.push({ tag: utxo.label, color: 'normal' })
    if (status) tags.push({ tag: status, color: ADDRESS_STATUS_COLORS[status] || 'normal' })
    if (fb.utxo.isLocked(utxo) && locktime) tags.push({ tag: `locked until ${locktime}`, color: 'normal' })

    return tags
  }

  const tableData: TableTypes.Data = useMemo(
    () => ({
      nodes: utxos.map((utxo: Utxo) => ({ ...utxo, id: utxo.utxo })),
    }),
    [utxos]
  )

  const tableTheme = useTheme(TABLE_THEME)

  const onTableSelectChange = (action: any, state: any) => {
    setSelectedUtxoIds(state.ids)
  }

  const tableSelect = useRowSelect(
    tableData,
    {
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
      sortFns: {
        [SORT_KEYS.frozenOrLocked]: (array) =>
          array.sort((a, b) => {
            const aUtxo = toUtxo(a)
            const bUtxo = toUtxo(b)
            if (fb.utxo.isLocked(aUtxo) && !fb.utxo.isLocked(bUtxo)) return -1
            if (!fb.utxo.isLocked(aUtxo) && fb.utxo.isLocked(bUtxo)) return 1
            if (fb.utxo.isLocked(aUtxo) && fb.utxo.isLocked(bUtxo)) return 0
            if (aUtxo.frozen && !bUtxo.frozen) return -1
            if (!aUtxo.frozen && bUtxo.frozen) return 1
            if (aUtxo.frozen && bUtxo.frozen) return 0
            return 0
          }),
        [SORT_KEYS.value]: (array) => array.sort((a, b) => a.value - b.value),
      },
    }
  )

  const frozenOrLocked = (utxo: Utxo) => {
    if (utxo.frozen && !fb.utxo.isLocked(utxo)) {
      return (
        <div className={styles.frozenLockedTag}>
          <Sprite className={styles.iconFrozen} symbol="snowflake" width="20" height="20" />
        </div>
      )
    }
    if (fb.utxo.isLocked(utxo)) {
      return (
        <div className={styles.frozenLockedTag}>
          <Sprite className={styles.iconLocked} symbol="timelock" width="20" height="20" />
        </div>
      )
    }
  }

  return (
    <div className={styles.utxoList}>
      <Table
        data={tableData}
        theme={tableTheme}
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
                <HeaderCellSort sortKey={SORT_KEYS.value}>Value</HeaderCellSort>
                <HeaderCell>Address</HeaderCell>
                <HeaderCell>Tags</HeaderCell>
                <HeaderCell></HeaderCell>
              </HeaderRow>
            </Header>
            <Body>
              {tableList.map((item) => (
                <Row key={item.id} item={item}>
                  <CellSelect item={item} />
                  <Cell>{frozenOrLocked(toUtxo(item))}</Cell>
                  <Cell>
                    <Balance
                      valueString={toUtxo(item).value.toString()}
                      convertToUnit={settings.unit}
                      showBalance={settings.showBalance}
                    />
                  </Cell>
                  <Cell>
                    <code>{toUtxo(item).address}</code>
                  </Cell>
                  <Cell>
                    <div className={styles.utxoTagList}>
                      {utxoTags(toUtxo(item), walletInfo).map((tag, index) => (
                        <div className={classnames(styles.utxoTag, styles[`utxoTag-${tag.color}`])}>
                          <div />
                          <div>{tag.tag}</div>
                        </div>
                      ))}
                    </div>
                  </Cell>
                  <Cell>
                    <rb.Button
                      className={styles.utxoListButtonDetails}
                      variant="link"
                      onClick={() => setDetailUtxo(toUtxo(item))}
                    >
                      Details
                    </rb.Button>
                  </Cell>
                </Row>
              ))}
            </Body>
          </>
        )}
      </Table>
    </div>
  )
}

export { UtxoList }
