import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { usePagination } from '@table-library/react-table-library/pagination'
import { useSort, HeaderCellSort, SortToggleType } from '@table-library/react-table-library/sort'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as rb from 'react-bootstrap'
import { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Helper as ApiHelper } from '../libs/JmWalletApi'
import * as ObwatchApi from '../libs/JmObwatchApi'
import { useSettings } from '../context/SettingsContext'
import Balance from './Balance'
import Sprite from './Sprite'
import TablePagination from './TablePagination'
import { factorToPercentage, isAbsoluteOffer, isRelativeOffer } from '../utils'
import { isDebugFeatureEnabled, isDevMode } from '../constants/debugFeatures'
import ToggleSwitch from './ToggleSwitch'
import { pseudoRandomNumber } from './Send/helpers'
import { JM_DUST_THRESHOLD } from '../constants/config'
import styles from './Orderbook.module.css'

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 1fr 5rem 1fr 2fr 2fr 2fr 2fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    &:nth-of-type(3) div div {
      justify-content: center;
    }
    &:nth-of-type(4) div div {
      justify-content: end;
    }
    &:nth-of-type(5) div div {
      justify-content: end;
    }
    &:nth-of-type(6) div div {
      justify-content: end;
    }
    &:nth-of-type(7) div div {
      justify-content: end;
    }
    &:nth-of-type(8) div div {
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

const withTooltip = (node: ReactElement, tooltip: string, overlayProps?: Partial<rb.OverlayTriggerProps>) => {
  return (
    <rb.OverlayTrigger {...overlayProps} overlay={(props) => <rb.Tooltip {...props}>{tooltip}</rb.Tooltip>}>
      {node}
    </rb.OverlayTrigger>
  )
}

const renderOrderType = (type: OrderTypeProps) => {
  const elem = <rb.Badge bg={type.badgeColor}>{type.displayValue}</rb.Badge>
  return type.tooltip ? withTooltip(elem, type.tooltip) : elem
}

type OrderTypeProps = {
  value: string // original value, example: 'sw0reloffer', 'swreloffer', 'reloffer', 'sw0absoffer', 'swabsoffer', 'absoffer'
  displayValue: string // example: "absolute" or "relative" (respecting i18n)
  badgeColor: 'info' | 'primary' | 'secondary'
  tooltip?: 'Native SW Absolute Fee' | 'Native SW Relative Fee' | string
  isAbsolute?: boolean
  isRelative?: boolean
}
interface OrderTableEntry {
  type: OrderTypeProps
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  orderId: string // example: "0" (not unique!)
  fee: {
    value: number
    displayValue: string // example: "250" (abs offers) or "0.000100%" (rel offers)
  }
  minerFeeContribution: string // example: "0"
  minimumSize: string // example: "27300"
  maximumSize: string // example: "237499972700"
  bondValue: {
    value: number
    displayValue: string // example: "0" (no fb) or "114557102085.28133"
  }
}

interface OrderTableRow extends OrderTableEntry, TableTypes.TableNode {}

// `TableNode` is known to have same properties as `OrderTableEntry`, hence prefer casting over object destructuring
const asOrderTableEntry = (tableNode: TableTypes.TableNode) => tableNode as unknown as OrderTableRow

const SORT_KEYS = {
  type: 'TYPE',
  counterparty: 'COUNTERPARTY',
  fee: 'FEE',
  minimumSize: 'MINIMUM_SIZE',
  maximumSize: 'MAXIMUM_SIZE',
  minerFeeContribution: 'MINER_FEE_CONTRIBUTION',
  bondValue: 'BOND_VALUE',
}

const orderTypeProps = (offer: ObwatchApi.Offer, t: TFunction): OrderTypeProps => {
  if (isAbsoluteOffer(offer.ordertype)) {
    return {
      value: offer.ordertype,
      displayValue: t('orderbook.text_offer_type_absolute'),
      badgeColor: 'info',
      tooltip: offer.ordertype === 'sw0absoffer' ? 'Native SW Absolute Fee' : offer.ordertype,
      isAbsolute: true,
    }
  }
  if (isRelativeOffer(offer.ordertype)) {
    return {
      value: offer.ordertype,
      displayValue: t('orderbook.text_offer_type_relative'),
      badgeColor: 'primary',
      tooltip: offer.ordertype === 'sw0reloffer' ? 'Native SW Relative Fee' : offer.ordertype,
      isRelative: true,
    }
  }
  return {
    value: offer.ordertype,
    displayValue: offer.ordertype,
    badgeColor: 'secondary',
  }
}

const renderOrderFee = (val: string, settings: any) => {
  return val.includes('%') ? (
    <span className="font-monospace">{val}</span>
  ) : (
    <Balance valueString={val} convertToUnit={settings.unit} showBalance={true} />
  )
}

const renderOrderAsRow = (item: OrderTableRow, settings: any) => {
  return (
    <Row key={item.id} item={item} className={item.__highlighted ? styles.highlighted : ''}>
      <Cell className="font-monospace">{item.counterparty}</Cell>
      <Cell>{item.orderId}</Cell>
      <Cell>{renderOrderType(item.type)}</Cell>
      <Cell>{renderOrderFee(item.fee.displayValue, settings)}</Cell>
      <Cell>
        <Balance valueString={item.minimumSize} convertToUnit={settings.unit} showBalance={true} />
      </Cell>
      <Cell>
        <Balance valueString={item.maximumSize} convertToUnit={settings.unit} showBalance={true} />
      </Cell>
      <Cell hide={true}>
        <Balance valueString={item.minerFeeContribution} convertToUnit={settings.unit} showBalance={true} />
      </Cell>
      <Cell className="font-monospace">{item.bondValue.displayValue}</Cell>
    </Row>
  )
}

interface OrderbookTableProps {
  data: TableTypes.Data<OrderTableRow>
}

const OrderbookTable = ({ data }: OrderbookTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const tableTheme = useTheme(TABLE_THEME)
  const pagination = usePagination(data, {
    state: {
      page: 0,
      size: 25,
    },
  })

  const tableSort = useSort(
    data,
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
        [SORT_KEYS.type]: (array) => array.sort((a, b) => a.type.displayValue.localeCompare(b.type.displayValue)),
        [SORT_KEYS.fee]: (array) =>
          array.sort((a, b) => {
            const aOrder = asOrderTableEntry(a)
            const bOrder = asOrderTableEntry(b)

            if (aOrder.type.isAbsolute !== bOrder.type.isAbsolute) {
              return aOrder.type.isAbsolute === true ? 1 : -1
            }
            return aOrder.fee.value - bOrder.fee.value
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
        [SORT_KEYS.bondValue]: (array) => array.sort((a, b) => a.bondValue.value - b.bondValue.value),
      },
    },
  )

  const pinnedOfferRows = useMemo(
    () =>
      data.nodes
        .filter((item: OrderTableRow) => item.__pinned === true)
        .map((item: OrderTableRow) => renderOrderAsRow(item, settings)),
    [data, settings],
  )

  return (
    <>
      <Table
        data={data}
        theme={tableTheme}
        pagination={pagination}
        sort={tableSort}
        layout={{ custom: true, horizontalScroll: true }}
        className="table striped"
      >
        {(tableList: TableTypes.TableProps<OrderTableRow>) => (
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
                <HeaderCellSort hide={true} sortKey={SORT_KEYS.minerFeeContribution}>
                  {t('orderbook.table.heading_miner_fee_contribution')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.bondValue}>{t('orderbook.table.heading_bond_value')}</HeaderCellSort>
              </HeaderRow>
            </Header>
            <Body>
              {pinnedOfferRows}
              {tableList
                .filter((item: OrderTableRow) => item.__pinned !== true)
                .map((item: OrderTableRow) => renderOrderAsRow(item, settings))}
            </Body>
          </>
        )}
      </Table>
      <div className="mt-4 mb-4 mb-lg-0">
        <TablePagination data={data} pagination={pagination} />
      </div>
    </>
  )
}

const offerToTableEntry = (offer: ObwatchApi.Offer, t: TFunction): OrderTableEntry => {
  return {
    type: orderTypeProps(offer, t),
    counterparty: offer.counterparty,
    orderId: String(offer.oid),
    fee:
      typeof offer.cjfee === 'number'
        ? {
            value: offer.cjfee,
            displayValue: String(offer.cjfee),
          }
        : (() => {
            const value = parseFloat(offer.cjfee)
            return {
              value,
              displayValue: factorToPercentage(value).toFixed(4) + '%',
            }
          })(),
    minerFeeContribution: String(offer.txfee),
    minimumSize: String(offer.minsize),
    maximumSize: String(offer.maxsize),
    bondValue: {
      value: offer.fidelity_bond_value,
      displayValue: String(offer.fidelity_bond_value.toFixed(0)),
    },
  }
}

interface OrderbookProps {
  entries: OrderTableEntry[]
  refresh: (signal: AbortSignal) => Promise<void>
  nickname?: string
}

export function Orderbook({ entries, refresh, nickname }: OrderbookProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const [search, setSearch] = useState('')
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)
  const [isHighlightOwnOffers, setIsHighlightOwnOffers] = useState(false)
  const [isPinToTopOwnOffers, setIsPinToTopOwnOffers] = useState(false)
  const [highlightedOrders, setHighlightedOrders] = useState<OrderTableEntry[]>([])
  const [pinToTopOrders, setPinToTopOrders] = useState<OrderTableEntry[]>([])

  const tableData: TableTypes.Data<OrderTableRow> = useMemo(() => {
    const searchVal = search.replace('.', '').toLowerCase()
    const filteredOrders =
      searchVal === ''
        ? entries
        : entries.filter((entry) => {
            return (
              entry.type.displayValue.toLowerCase().includes(searchVal) ||
              entry.counterparty.toLowerCase().includes(searchVal) ||
              entry.fee.displayValue.replace('.', '').toLowerCase().includes(searchVal) ||
              entry.minimumSize.replace('.', '').toLowerCase().includes(searchVal) ||
              entry.maximumSize.replace('.', '').toLowerCase().includes(searchVal) ||
              entry.minerFeeContribution.replace('.', '').toLowerCase().includes(searchVal) ||
              entry.bondValue.displayValue.replace('.', '').toLowerCase().includes(searchVal) ||
              entry.orderId.toLowerCase().includes(searchVal)
            )
          })
    const nodes = filteredOrders.map((order) => ({
      ...order,
      id: `${order.counterparty}_${order.orderId}`,
      __highlighted: highlightedOrders.includes(order),
      __pinned: pinToTopOrders.includes(order),
    }))

    return { nodes }
  }, [entries, search, highlightedOrders, pinToTopOrders])

  const counterpartyCount = useMemo(() => new Set(entries.map((it) => it.counterparty)).size, [entries])
  const counterpartyCountFiltered = useMemo(
    () => new Set(tableData.nodes.map((it) => it.counterparty)).size,
    [tableData],
  )

  const ownOffers = useMemo(() => {
    return nickname ? entries.filter((it) => it.counterparty === nickname) : []
  }, [nickname, entries])

  useEffect(() => {
    setHighlightedOrders(isHighlightOwnOffers ? ownOffers : [])
  }, [ownOffers, isHighlightOwnOffers])

  useEffect(() => {
    setPinToTopOrders(isPinToTopOwnOffers ? ownOffers : [])
  }, [ownOffers, isPinToTopOwnOffers])

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
              refresh(abortCtrl.signal).finally(() => {
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
            {search === '' ? (
              <>
                {t('orderbook.text_orderbook_summary', {
                  count: entries.length,
                  counterpartyCount,
                })}
              </>
            ) : (
              <>
                {t('orderbook.text_orderbook_summary_filtered', {
                  count: tableData.nodes.length,
                  counterpartyCount: counterpartyCountFiltered,
                })}
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
              disabled={isLoadingRefresh}
              onChange={(e) => setSearch(e.target.value)}
            />
          </rb.Form.Group>
        </div>
      </div>

      <div className="px-md-3 pb-2">
        {entries.length === 0 ? (
          <rb.Alert variant="info">{t('orderbook.alert_empty_orderbook')}</rb.Alert>
        ) : (
          <>
            {nickname && (
              <>
                <div className="d-flex flex-column gap-2 mb-3 ps-3 ps-md-0 pt-3 pt-lg-0">
                  <ToggleSwitch
                    label={t('orderbook.label_highlight_own_orders')}
                    subtitle={ownOffers.length === 0 ? t('orderbook.text_highlight_own_orders_subtitle') : undefined}
                    toggledOn={isHighlightOwnOffers}
                    onToggle={(isToggled) => setIsHighlightOwnOffers(isToggled)}
                    disabled={isLoadingRefresh || ownOffers.length === 0}
                  />
                  {ownOffers.length > 0 && (
                    <ToggleSwitch
                      label={t('orderbook.label_pin_to_top_own_orders')}
                      subtitle={t('orderbook.text_pin_to_top_own_orders_subtitle')}
                      toggledOn={isPinToTopOwnOffers}
                      onToggle={(isToggled) => {
                        setIsPinToTopOwnOffers(isToggled)
                        if (isToggled) {
                          setIsHighlightOwnOffers(true)
                        }
                      }}
                      disabled={isLoadingRefresh}
                    />
                  )}
                </div>
                <div className="mb-3 ps-3 ps-md-0 pt-3 pt-lg-0"></div>
              </>
            )}
            <OrderbookTable data={tableData} />
          </>
        )}
      </div>
    </div>
  )
}

type OrderbookOverlayProps = rb.OffcanvasProps & {
  nickname?: string
}

export function OrderbookOverlay({ nickname, show, onHide }: OrderbookOverlayProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<SimpleAlert>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [offers, setOffers] = useState<ObwatchApi.Offer[]>()
  const tableEntries = useMemo(() => offers && offers.map((offer) => offerToTableEntry(offer, t)), [offers, t])
  const [__dev_showGenerateDemoOfferButton] = useState(isDebugFeatureEnabled('enableDemoOrderbook'))

  const __dev_generateDemoReportEntryButton = () => {
    const randomMinsize = pseudoRandomNumber(JM_DUST_THRESHOLD, JM_DUST_THRESHOLD + 100_000)
    const randomOrdertype = Math.random() > 0.5 ? 'sw0absoffer' : 'sw0reloffer'
    const randomCounterparty = `demo_` + pseudoRandomNumber(0, 10)
    setOffers((it) => {
      const randomOffer = {
        counterparty: randomCounterparty,
        oid: (it || []).filter((e) => e.counterparty === randomCounterparty).length,
        ordertype: randomOrdertype,
        minsize: randomMinsize,
        maxsize: randomMinsize + pseudoRandomNumber(21_000, 21_000_000),
        txfee: 0,
        cjfee: randomOrdertype === 'sw0absoffer' ? pseudoRandomNumber(0, 10_000) : Math.random().toFixed(5),
        fidelity_bond_value: Math.random() > 0.25 ? 0 : pseudoRandomNumber(1_000, 21_000_000),
      }
      return [...(it || []), randomOffer]
    })
  }

  const refresh = useCallback(
    (signal: AbortSignal) => {
      return ObwatchApi.refreshOrderbook({ signal })
        .then((res) => {
          if (!res.ok) {
            // e.g. error is raised if ob-watcher is not running
            return ApiHelper.throwError(res)
          }

          return ObwatchApi.fetchOrderbook({ signal })
        })
        .then((orderbook) => {
          if (signal.aborted) return

          setAlert(undefined)
          setOffers(orderbook.offers || [])

          if (isDevMode()) {
            console.table(orderbook.offers)
          }
        })
        .catch((e) => {
          if (signal.aborted) return
          const message = t('orderbook.error_loading_orderbook_failed', {
            reason: e.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })
    },
    [t],
  )

  useEffect(() => {
    if (!show) return

    const abortCtrl = new AbortController()

    setIsLoading(true)
    refresh(abortCtrl.signal).finally(() => {
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
        <rb.Container fluid="lg">
          <div className="w-100 d-flex">
            <div className="d-flex align-items-center flex-1">
              <rb.Offcanvas.Title>{t('orderbook.title')}</rb.Offcanvas.Title>
            </div>
            <div>
              <rb.Button variant="link" className="unstyled pe-0" onClick={onHide}>
                <Sprite symbol="cancel" width="32" height="32" />
              </rb.Button>
            </div>
          </div>
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="lg" className="py-3">
          {!isInitialized && isLoading ? (
            Array(5)
              .fill('')
              .map((_, index) => {
                return (
                  <rb.Placeholder key={index} as="div" animation="wave">
                    <rb.Placeholder xs={12} className={styles.orderbookContentPlaceholder} />
                  </rb.Placeholder>
                )
              })
          ) : (
            <>
              {__dev_showGenerateDemoOfferButton && (
                <rb.Row>
                  <rb.Col className="px-0 mb-2">
                    <rb.Button
                      className="position-relative"
                      variant="outline-dark"
                      disabled={false}
                      onClick={() => __dev_generateDemoReportEntryButton()}
                    >
                      <div className="d-flex justify-content-center align-items-center">
                        Generate demo entry
                        <Sprite symbol="plus" width="20" height="20" className="ms-2" />
                      </div>
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                        dev
                      </span>
                    </rb.Button>
                  </rb.Col>
                </rb.Row>
              )}
              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
              {tableEntries && (
                <rb.Row>
                  <rb.Col className="px-0">
                    <Orderbook nickname={nickname} entries={tableEntries} refresh={refresh} />
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
