import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useSort, HeaderCellSort, SortToggleType } from '@table-library/react-table-library/sort'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as rb from 'react-bootstrap'
import { useTranslation, TFunction } from 'react-i18next'
import * as ObwatchApi from '../libs/JmObwatchApi'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import Balance from './Balance'
import styles from './Orderbook.module.css'
import Sprite from './Sprite'

const SORT_KEYS = {
  type: 'TYPE',
  counterparty: 'COUNTERPARTY',
  fee: 'FEE',
  minimumSize: 'MINIMUM_SIZE',
  maximumSize: 'MAXIMUM_SIZE',
  minerFeeContribution: 'MINER_FEE_CONTRIBUTION',
  bondValue: 'BOND_VALUE',
}

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 1fr 5rem 1fr 1fr 2fr 2fr 2fr 2fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    &:nth-of-type(3) button {
      display: flex;
      justify-content: center;
    }
    &:nth-of-type(4) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(5) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(6) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(7) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(8) button {
      display: flex;
      justify-content: end;
    }
  `,
  Cell: `
    &:nth-of-type(3) {
      text-align: center;
    }
    &:nth-of-type(4) {
      text-align: right;
    }
    &:nth-of-type(5) {
      text-align: right;
    }
    &:nth-of-type(6) {
      text-align: right;
    }
    &:nth-of-type(7) {
      text-align: right;
    }
    &:nth-of-type(8) {
      text-align: right;
    }
  `,
}

const withTooltip = (node: React.ReactElement, tooltip: string) => {
  return (
    <rb.OverlayTrigger overlay={(props) => <rb.Tooltip {...props}>{tooltip}</rb.Tooltip>}>{node}</rb.OverlayTrigger>
  )
}

// `TableNode` is known to have same properties as `ObwatchApi.Order`, hence prefer casting over object destructuring
const toOrder = (tableNode: TableTypes.TableNode): ObwatchApi.Order => tableNode as unknown as ObwatchApi.Order

const renderOrderType = (val: string, t: TFunction<'translation', undefined>) => {
  if (val === ObwatchApi.ABSOLUTE_ORDER_TYPE_VAL) {
    return withTooltip(<rb.Badge bg="info">{t('orderbook.text_offer_type_absolute')}</rb.Badge>, val)
  }
  if (val === ObwatchApi.RELATIVE_ORDER_TYPE_VAL) {
    return withTooltip(<rb.Badge bg="primary">{t('orderbook.text_offer_type_relative')}</rb.Badge>, val)
  }
  return <rb.Badge bg="secondary">{val}</rb.Badge>
}

const renderOrderFee = (val: string, settings: any) => {
  return val.includes('%') ? <>{val}</> : <Balance valueString={val} convertToUnit={settings.unit} showBalance={true} />
}

interface OrderbookTableProps {
  tableData: TableTypes.Data
}

const OrderbookTable = ({ tableData }: OrderbookTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const tableTheme = useTheme(TABLE_THEME)

  const tableSort = useSort(
    tableData,
    {
      state: {
        sortKey: SORT_KEYS.minimumSize,
        reverse: false,
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
        [SORT_KEYS.type]: (array) => array.sort((a, b) => a.type.localeCompare(b.type)),
        [SORT_KEYS.fee]: (array) =>
          array.sort((a, b) => {
            const aOrder = toOrder(a)
            const bOrder = toOrder(b)

            if (aOrder.type !== bOrder.type) {
              return aOrder.type === ObwatchApi.ABSOLUTE_ORDER_TYPE_VAL ? 1 : -1
            }

            if (aOrder.type === ObwatchApi.ABSOLUTE_ORDER_TYPE_VAL) {
              return +aOrder.fee - +bOrder.fee
            } else {
              const aIndexOfPercent = aOrder.fee.indexOf('%')
              const bIndexOfPercent = bOrder.fee.indexOf('%')

              if (aIndexOfPercent > 0 && bIndexOfPercent > 0) {
                return +aOrder.fee.substring(0, aIndexOfPercent) - +bOrder.fee.substring(0, bIndexOfPercent)
              }
            }

            return 0
          }),
        [SORT_KEYS.minimumSize]: (array) => array.sort((a, b) => a.minimumSize - b.minimumSize),
        [SORT_KEYS.maximumSize]: (array) => array.sort((a, b) => a.maximumSize - b.maximumSize),
        [SORT_KEYS.minerFeeContribution]: (array) =>
          array.sort((a, b) => a.minerFeeContribution - b.minerFeeContribution),
        [SORT_KEYS.counterparty]: (array) =>
          array.sort((a, b) => {
            const val = a.counterparty.localeCompare(b.counterparty)
            return val !== 0 ? val : +a.orderId - +b.orderId
          }),
        [SORT_KEYS.bondValue]: (array) => array.sort((a, b) => a.bondValue - b.bondValue),
      },
    }
  )

  return (
    <Table data={tableData} theme={tableTheme} sort={tableSort} layout={{ custom: true, horizontalScroll: true }}>
      {(tableList) => (
        <>
          <Header>
            <HeaderRow>
              <HeaderCellSort sortKey={SORT_KEYS.counterparty}>
                {t('orderbook.table.heading_counterparty')}
              </HeaderCellSort>
              <HeaderCell>{t('orderbook.table.heading_order_id')}</HeaderCell>
              <HeaderCellSort sortKey={SORT_KEYS.type}>{t('orderbook.table.heading_type')}</HeaderCellSort>
              <HeaderCellSort sortKey={SORT_KEYS.fee}>{t('orderbook.table.heading_fee')}</HeaderCellSort>
              <HeaderCellSort sortKey={SORT_KEYS.minimumSize}>
                {t('orderbook.table.heading_minimum_size')}
              </HeaderCellSort>
              <HeaderCellSort sortKey={SORT_KEYS.maximumSize}>
                {t('orderbook.table.heading_maximum_size')}
              </HeaderCellSort>
              <HeaderCellSort sortKey={SORT_KEYS.minerFeeContribution}>
                {t('orderbook.table.heading_miner_fee_contribution')}
              </HeaderCellSort>
              <HeaderCellSort sortKey={SORT_KEYS.bondValue}>{t('orderbook.table.heading_bond_value')}</HeaderCellSort>
            </HeaderRow>
          </Header>
          <Body>
            {tableList.map((item) => {
              const order = toOrder(item)
              return (
                <Row key={item.id} item={item}>
                  <Cell>{order.counterparty}</Cell>
                  <Cell>{order.orderId}</Cell>
                  <Cell>{renderOrderType(order.type, t)}</Cell>
                  <Cell>{renderOrderFee(order.fee, settings)}</Cell>
                  <Cell>
                    <Balance valueString={order.minimumSize} convertToUnit={settings.unit} showBalance={true} />
                  </Cell>
                  <Cell>
                    <Balance valueString={order.maximumSize} convertToUnit={settings.unit} showBalance={true} />
                  </Cell>
                  <Cell>
                    <Balance
                      valueString={order.minerFeeContribution}
                      convertToUnit={settings.unit}
                      showBalance={true}
                    />
                  </Cell>
                  <Cell>{order.bondValue}</Cell>
                </Row>
              )
            })}
          </Body>
        </>
      )}
    </Table>
  )
}

interface OrderbookProps {
  orders: ObwatchApi.Order[]
  refresh: (abortCtrl: AbortController) => Promise<void>
}

export function Orderbook({ orders, refresh }: OrderbookProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const [search, setSearch] = useState('')
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const counterpartyCount = useMemo(() => new Set(orders.map((it) => it.counterparty)).size, [orders])

  const tableData: TableTypes.Data = useMemo(() => {
    const searchVal = search.replace('.', '').toLowerCase()
    const nodes = orders
      .filter((order) => {
        if (search === '') return true
        return (
          order.type.toLowerCase().includes(searchVal) ||
          order.counterparty.toLowerCase().includes(searchVal) ||
          order.fee.replace('.', '').toLowerCase().includes(searchVal) ||
          order.minimumSize.replace('.', '').toLowerCase().includes(searchVal) ||
          order.maximumSize.replace('.', '').toLowerCase().includes(searchVal) ||
          order.minerFeeContribution.replace('.', '').toLowerCase().includes(searchVal) ||
          order.bondValue.replace('.', '').toLowerCase().includes(searchVal) ||
          order.orderId.toLowerCase().includes(searchVal)
        )
      })
      .map((order) => ({
        ...order,
        id: `${order.counterparty}_${order.orderId}`,
      }))

    return { nodes }
  }, [orders, search])

  return (
    <div className={styles.orderbookContainer}>
      <div className={styles.titleBar}>
        <div className="d-flex justify-content-center align-items-center gap-2">
          <rb.Button
            className={styles.refreshButton}
            variant={settings.theme}
            onClick={() => {
              if (isLoadingRefresh) return

              setIsLoadingRefresh(true)

              const abortCtrl = new AbortController()
              refresh(abortCtrl).finally(() => {
                // as refreshing is fast most of the time, add a short delay to avoid flickering
                setTimeout(() => setIsLoadingRefresh(false), 250)
              })
            }}
          >
            {isLoadingRefresh ? (
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              <Sprite symbol="refresh" width="24" height="24" />
            )}
          </rb.Button>
          <div className="small">
            {t('orderbook.text_orderbook_summary', {
              counterpartyCount,
              orderCount: orders.length,
            })}
            {search && (
              <>
                <br />(
                {t('orderbook.text_orderbook_filter_count', {
                  filterCount: tableData.nodes.length,
                })}
                )
              </>
            )}
          </div>
        </div>
        <div>
          <rb.Form.Group controlId="search">
            <rb.Form.Label className="m-0 pe-2 d-none">{t('orderbook.label_search')}</rb.Form.Label>
            <rb.Form.Control
              name="search"
              placeholder={t('orderbook.placeholder_search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </rb.Form.Group>
        </div>
      </div>
      <div className="px-md-3 pb-2">
        {orders.length === 0 ? (
          <rb.Alert variant="info">{t('orderbook.alert_empty_orderbook')}</rb.Alert>
        ) : (
          <OrderbookTable tableData={tableData} />
        )}
      </div>
    </div>
  )
}

export function OrderbookOverlay({ show, onHide }: rb.OffcanvasProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<ObwatchApi.Order[] | null>(null)

  const refresh = useCallback(
    (abortCtrl: AbortController) => {
      return ObwatchApi.fetchOrderbook({ signal: abortCtrl.signal })
        .then((orders) => {
          if (abortCtrl.signal.aborted) return

          setOrders(orders)
          setAlert(null)
        })
        .catch((e) => {
          if (abortCtrl.signal.aborted) return
          const message = t('orderbook.error_loading_orderbook_failed', {
            reason: e.message || 'Unknown reason',
          })
          setAlert({ variant: 'danger', message })
        })
    },
    [t]
  )

  useEffect(() => {
    if (!show) return

    const abortCtrl = new AbortController()

    setIsLoading(true)
    refresh(abortCtrl).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
      setIsInitialized(true)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [show, refresh])

  return (
    <rb.Offcanvas
      className={`offcanvas-fullscreen ${styles.overlayContainer}`}
      show={show}
      onHide={onHide}
      placement="bottom"
    >
      <rb.Offcanvas.Header>
        <rb.Container>
          <div className="w-100 d-flex">
            <div className="d-flex align-items-center flex-1">
              <rb.Offcanvas.Title>{t('orderbook.title')}</rb.Offcanvas.Title>
            </div>
            <div>
              <rb.Button variant="link" className="unstyled pe-0 ms-auto me-auto me-md-0" onClick={onHide}>
                <Sprite symbol="cancel" width="32" height="32" />
              </rb.Button>
            </div>
          </div>
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="md" className="py-4 py-sm-5">
          {!isInitialized && isLoading ? (
            Array(5)
              .fill('')
              .map((_, index) => {
                return (
                  <rb.Placeholder key={index} as="div" animation="wave">
                    <rb.Placeholder xs={12} className={styles['orderbook-line-placeholder']} />
                  </rb.Placeholder>
                )
              })
          ) : (
            <>
              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
              {orders && (
                <rb.Row>
                  <rb.Col>
                    <Orderbook orders={orders} refresh={refresh} />
                  </rb.Col>
                </rb.Row>
              )}
            </>
          )}
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
